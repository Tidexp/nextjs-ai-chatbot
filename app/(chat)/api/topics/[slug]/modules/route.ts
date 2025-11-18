import { type NextRequest, NextResponse } from 'next/server';
import {
  getTopicBySlug,
  getModulesAndLessonsByTopicId,
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.pathname.split('/').at(-2);
  if (!slug) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const topic = await getTopicBySlug(slug);
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data = await getModulesAndLessonsByTopicId(topic.id);
  return NextResponse.json(data);
}
