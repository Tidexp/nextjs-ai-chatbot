import { auth } from '@/app/(auth)/auth';
import { getResponseQualityMetrics } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const timeRange = searchParams.get('timeRange') || '30d';

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

  // Users can only view their own analytics
  if (session.user.id !== userId) {
    return new ChatSDKError('forbidden:vote').toResponse();
  }

  try {
    const limit = timeRange === '7d' ? 50 : timeRange === '30d' ? 200 : 500;
    const analytics = await getResponseQualityMetrics({ userId, limit });
    
    return Response.json(analytics, { status: 200 });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return new ChatSDKError('bad_request:database', 'Failed to get analytics').toResponse();
  }
}
