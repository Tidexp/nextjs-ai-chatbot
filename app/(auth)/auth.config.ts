import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  // Persist sessions via JWT cookies (30 days). Make sure NEXTAUTH_SECRET is set
  // so cookies remain valid across server restarts and deployments.
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh JWT every 24h
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 30,
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {},
} satisfies NextAuthConfig;
