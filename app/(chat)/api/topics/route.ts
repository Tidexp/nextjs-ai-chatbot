import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { createTopic, getTopics } from '@/lib/db/queries';

export async function GET() {
  try {
    const topics = await getTopics();
    return Response.json({ topics }, { status: 200 });
  } catch (e) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

  const body = await request.json().catch(() => null);
  const { seed, topic } = body || {};

  if (seed === true) {
    const defaults = [
      { slug: 'web-development', title: 'Web Development', category: 'Software', description: 'HTML, CSS, JavaScript, React, Node.js, and modern web tooling.' },
      { slug: 'assembly', title: 'Assembly Programming', category: 'Systems', description: 'Low-level programming concepts, registers, memory, and basic algorithms.' },
      { slug: 'data-structures-algorithms', title: 'Data Structures & Algorithms', category: 'CS', description: 'Arrays, linked lists, trees, graphs, sorting, searching, and complexity.' },
      { slug: 'python-foundations', title: 'Python Foundations', category: 'Programming', description: 'Python syntax, standard library, testing, and packaging.' },
      { slug: 'devops', title: 'DevOps Essentials', category: 'Infra', description: 'CI/CD, Docker, Kubernetes basics, observability, and cloud workflows.' },
      { slug: 'sql-database-design', title: 'SQL & Database Design', category: 'Data', description: 'SQL queries, normalization, indexing, and transactions.' },
    ];
    for (const t of defaults) {
      try { await createTopic(t); } catch {}
    }
    const topics = await getTopics();
    return Response.json({ topics }, { status: 200 });
  }

  if (topic && topic.slug && topic.title) {
    await createTopic(topic);
    const topics = await getTopics();
    return Response.json({ topics }, { status: 201 });
  }

  return new ChatSDKError('bad_request:api', 'Invalid payload').toResponse();
}

