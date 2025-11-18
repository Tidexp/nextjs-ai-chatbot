import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { CodePlayground } from '@/components/code-playground';

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    language?: string;
    lessonId?: string;
  }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const params = await searchParams;
  const initialCode = params.code ? decodeURIComponent(params.code) : '';
  const language = params.language || 'html';
  const lessonId = params.lessonId;

  return (
    <CodePlayground
      initialCode={initialCode}
      language={language as 'html' | 'css' | 'javascript'}
      lessonId={lessonId}
      userId={session.user.id}
      session={session}
    />
  );
}
