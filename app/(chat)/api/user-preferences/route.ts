import { auth } from '@/app/(auth)/auth';
import { getUserPreferences } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter userId is required.',
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:vote').toResponse();
  }

  // Users can only view their own preferences
  if (session.user.id !== userId) {
    return new ChatSDKError('forbidden:vote').toResponse();
  }

  try {
    const preferences = await getUserPreferences({ userId });
    return Response.json(preferences, { status: 200 });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return new ChatSDKError('bad_request:database', 'Failed to get user preferences').toResponse();
  }
}
