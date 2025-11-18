import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getUserById, updateUserDisplayName } from '@/lib/db/queries';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new ChatSDKError('unauthorized:account').toResponse();

  const user = await getUserById(session.user.id);
  if (!user) return new ChatSDKError('not_found:account').toResponse();
  return Response.json({ id: user.id, email: user.email, displayName: user.displayName }, { status: 200 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new ChatSDKError('unauthorized:account').toResponse();

  const body = await request.json().catch(() => null);
  const displayName = body?.displayName;
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    return new ChatSDKError('bad_request:api', 'Invalid display name').toResponse();
  }

  await updateUserDisplayName({ userId: session.user.id, displayName: displayName.trim() });
  return Response.json({ ok: true }, { status: 200 });
}

