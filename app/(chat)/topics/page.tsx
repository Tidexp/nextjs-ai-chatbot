import { getTopics } from '@/lib/db/queries';
import TopicExplorer from '@/components/topic-explorer';

export const dynamic = 'force-dynamic';

export default async function TopicsPage() {
  const topics = await getTopics();

  return (
    <div className="mx-auto max-w-6xl p-6">
      <TopicExplorer topics={topics} />
      {topics.length === 0 && (
        <form
          className="mt-10 text-center"
          action={async () => {
            'use server';
            await fetch(
              `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/topics`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seed: true }),
              },
            );
          }}
        >
          <button type="submit" className="text-sm underline">
            Seed default topics
          </button>
        </form>
      )}
    </div>
  );
}
