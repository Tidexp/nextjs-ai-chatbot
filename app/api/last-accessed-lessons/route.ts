import { auth } from '@/app/(auth)/auth';
import { getLastAccessedLessonsByUser } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const byTopic = await getLastAccessedLessonsByUser({
      userId: session.user.id,
    });

    return NextResponse.json(byTopic);
  } catch (error) {
    console.error('[api/last-accessed-lessons] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch last accessed lessons' },
      { status: 500 },
    );
  }
}
