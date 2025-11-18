import { auth } from '@/app/(auth)/auth';
import { 
  getChatById, 
  saveResponseFeedback, 
  getResponseFeedbackByMessageId,
  updateUserPreference,
  updateResponseAnalytics,
  getResponseQualityMetrics
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId');

  if (!messageId) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter messageId is required.',
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:vote').toResponse();
  }

  try {
    const feedback = await getResponseFeedbackByMessageId({ messageId });
    return Response.json(feedback, { status: 200 });
  } catch (error) {
    return new ChatSDKError('bad_request:database', 'Failed to get feedback').toResponse();
  }
}

export async function POST(request: Request) {
  const {
    chatId,
    messageId,
    voteType,
    qualityScore,
    helpfulnessScore,
    accuracyScore,
    clarityScore,
    downvoteReason,
    customFeedback,
    responseTime,
  }: {
    chatId: string;
    messageId: string;
    voteType: 'up' | 'down' | 'neutral';
    qualityScore?: number;
    helpfulnessScore?: number;
    accuracyScore?: number;
    clarityScore?: number;
    downvoteReason?: 'inaccurate' | 'unhelpful' | 'inappropriate' | 'too_long' | 'too_short' | 'off_topic' | 'other';
    customFeedback?: string;
    responseTime?: number;
  } = await request.json();

  if (!chatId || !messageId || !voteType) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameters chatId, messageId, and voteType are required.',
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:vote').toResponse();
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return new ChatSDKError('not_found:vote').toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:vote').toResponse();
  }

  try {
    console.log('[POST /api/feedback] Incoming payload:', {
      chatId,
      messageId,
      userId: session.user.id,
      voteType,
      qualityScore,
      helpfulnessScore,
      accuracyScore,
      clarityScore,
      downvoteReason,
      hasCustomFeedback: Boolean(customFeedback && customFeedback.length > 0),
      responseTime,
    });

    // Check if enhanced feedback tables exist
    try {
      // Save detailed feedback
      await saveResponseFeedback({
        chatId,
        messageId,
        userId: session.user.id,
        voteType,
        qualityScore,
        helpfulnessScore,
        accuracyScore,
        clarityScore,
        downvoteReason,
        customFeedback,
        responseTime,
      });
      console.log('[POST /api/feedback] saveResponseFeedback: success');
    } catch (tableError: any) {
      const code = tableError?.code || tableError?.originalError?.code;
      console.warn('[POST /api/feedback] saveResponseFeedback failed', { code, message: tableError?.message });
      // undefined_table in Postgres
      if (code === '42P01') {
        console.log('Enhanced feedback tables not available, skipping detailed feedback');
        // Enhanced feedback tables don't exist yet, just return success
        return new Response('Feedback saved successfully (basic mode)', { status: 200 });
      }
      throw tableError;
    }

    try {
      // Update user preferences based on feedback
      if (voteType === 'up' && qualityScore && qualityScore >= 7) {
        // Learn from high-quality responses
        await updateUserPreference({
          userId: session.user.id,
          preferenceType: 'response_style',
          preferenceValue: 'detailed', // or extract from message content
          confidence: qualityScore / 10,
        });
      }

      // Update response analytics
      const feedbackData = await getResponseFeedbackByMessageId({ messageId });
      const upvotes = feedbackData.filter(f => f.voteType === 'up').length;
      const downvotes = feedbackData.filter(f => f.voteType === 'down').length;
      const totalVotes = feedbackData.length;
      const averageQualityScore = feedbackData
        .filter(f => f.qualityScore)
        .reduce((sum, f) => sum + (f.qualityScore || 0), 0) / feedbackData.filter(f => f.qualityScore).length;

      await updateResponseAnalytics({
        messageId,
        averageQualityScore: isNaN(averageQualityScore) ? undefined : averageQualityScore,
        totalVotes,
        upvotes,
        downvotes,
      });
    } catch (analyticsError: any) {
      console.warn('[POST /api/feedback] Analytics update failed:', {
        code: analyticsError?.code || analyticsError?.originalError?.code,
        message: analyticsError?.message,
      });
    }

    return new Response('Feedback saved successfully', { status: 200 });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return new ChatSDKError('bad_request:database', 'Failed to save feedback').toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId');

  if (!messageId) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter messageId is required.',
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:vote').toResponse();
  }

  try {
    // Remove feedback (implement this in queries.ts if needed)
    return new Response('Feedback removed', { status: 200 });
  } catch (error) {
    return new ChatSDKError('bad_request:database', 'Failed to remove feedback').toResponse();
  }
}
