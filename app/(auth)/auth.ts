import { compare } from 'bcrypt-ts';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { createGuestUser, getUser } from '@/lib/db/queries';
import { authConfig } from './auth.config';
import { DUMMY_PASSWORD } from '@/lib/constants';
import type { DefaultJWT } from 'next-auth/jwt';
import { createUser } from '@/lib/db/queries';
import { randomUUID } from 'node:crypto';

export type UserType = 'guest' | 'regular';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession['user'];
    accessToken?: string;
    error?: string;
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    error?: string;
  }
}

const refreshGoogleAccessToken = async (token: any) => {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken ?? '',
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error(
        '❌ Failed to refresh Google access token',
        refreshedTokens,
      );
      throw new Error('RefreshAccessTokenError');
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + (refreshedTokens.expires_in ?? 0) * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    } as typeof token;
  } catch (error) {
    console.error('❌ Error refreshing Google access token', error);
    return { ...token, error: 'RefreshAccessTokenError' } as typeof token;
  }
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Google({
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/drive.file',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;

        if (!user.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, user.password);

        if (!passwordsMatch) return null;

        return { ...user, type: 'regular' };
      },
    }),
    Credentials({
      id: 'guest',
      credentials: {},
      async authorize() {
        console.log('🔍 Creating guest user in auth...');
        const [guestUser] = await createGuestUser();
        console.log('✅ Guest user created in auth:', guestUser);
        return { ...guestUser, type: 'guest' };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Auto-create user for Google OAuth if they don't exist
      if (account?.provider === 'google' && profile?.email) {
        console.log('🔍 SignIn callback - checking user:', profile.email);
        const existingUsers = await getUser(profile.email);
        if (existingUsers.length === 0) {
          console.log('👤 Creating new user for Google OAuth:', profile.email);
          // Create user with a random password since they'll use OAuth
          const randomPassword = randomUUID();
          await createUser(
            profile.email,
            randomPassword,
            profile.name || profile.email,
          );
          console.log('✅ User created successfully');
        } else {
          console.log('✅ User already exists:', existingUsers[0].id);
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // For Google OAuth sign-in, always fetch from database to get our DB user ID
      if (account?.provider === 'google' && profile?.email) {
        console.log(
          '🔍 JWT callback - Google OAuth, fetching user:',
          profile.email,
        );
        const existingUsers = await getUser(profile.email);
        if (existingUsers.length > 0) {
          console.log(
            '✅ JWT callback - Found user in DB:',
            existingUsers[0].id,
          );
          token.id = existingUsers[0].id;
          token.type = existingUsers[0].type || 'regular';
        } else {
          console.error(
            '❌ JWT callback - User not found in DB after signIn:',
            profile.email,
          );
        }
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 55 * 60 * 1000;
      }
      // For credentials login (email/password or guest)
      else if (user) {
        console.log('🔍 JWT callback - credentials user:', user);
        token.id = user.id as string;
        token.type = user.type || 'regular';
        console.log('✅ JWT callback - token updated:', {
          id: token.id,
          type: token.type,
        });
      }

      // Refresh Google access token if expired
      if (
        !account &&
        token.accessToken &&
        token.refreshToken &&
        token.accessTokenExpires &&
        Date.now() > token.accessTokenExpires - 60_000
      ) {
        return refreshGoogleAccessToken(token);
      }

      // Ensure type is always set
      if (!token.type) {
        token.type = 'regular';
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        console.log('🔍 Session callback - token:', {
          id: token.id,
          type: token.type,
        });
        session.user.id = token.id;
        session.user.type = (token.type || 'regular') as UserType;
        session.accessToken = token.accessToken;
        if (token.error) session.error = token.error;
        console.log('✅ Session callback - session updated:', {
          id: session.user.id,
          type: session.user.type,
        });
      }

      return session;
    },
  },
});
