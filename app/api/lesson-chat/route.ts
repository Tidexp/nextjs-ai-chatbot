import { auth } from '@/app/(auth)/auth';
import { saveChat, getChatByLessonAndUser } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import { ChatSDKError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const body = await request.json().catch(() => ({}));
    const lessonId = body?.lessonId;
    const topicId = body?.topicId;
    const moduleId = body?.moduleId;
    if (!lessonId) {
      return new ChatSDKError('bad_request:api').toResponse();
    }

    const userId = session.user.id;

    // Look for existing chat for this user + lesson (fast path)
    const existing = await getChatByLessonAndUser({ lessonId, userId });
    if (existing) {
      return Response.json({ id: existing.id }, { status: 200 });
    }

    // Try to create; handle possible unique-constraint race by catching DB error
    const newId = generateUUID();
    try {
      await saveChat({
        id: newId,
        userId,
        title: 'Lesson Chat',
        visibility: 'private',
        lessonId,
        topicId,
        moduleId,
      });
      return Response.json({ id: newId }, { status: 201 });
    } catch (err: any) {
      // If insert failed due to unique constraint (another request created it), return the existing one
      if (
        err?.cause?.code === '23505' ||
        err?.message?.includes('unique_user_lesson_chat')
      ) {
        const again = await getChatByLessonAndUser({ lessonId, userId });
        if (again) return Response.json({ id: again.id }, { status: 200 });
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof ChatSDKError) {
      return err.toResponse();
    }
    console.error('[api/lesson-chat] Unexpected error', err);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}
