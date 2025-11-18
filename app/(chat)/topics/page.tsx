import { getTopics } from '@/lib/db/queries';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TopicsPage() {
  const topics = await getTopics();

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Topics</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Pick a topic to start learning. We'll tailor the chat to the topic.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {topics.map((t) => (
          <div key={t.id} className="border rounded-lg p-4">
            <div className="text-xs uppercase text-muted-foreground">
              {t.category || 'General'}
            </div>
            <div className="font-medium text-lg">{t.title}</div>
            {t.description ? (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                {t.description}
              </p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <Link className="text-sm underline" href={`/topics/${t.slug}`}>
                Start learning
              </Link>
            </div>
          </div>
        ))}
      </div>
      {topics.length === 0 && (
        <form
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
          <button type="submit" className="mt-6 text-sm underline">
            Seed default topics
          </button>
        </form>
      )}
    </div>
  );
}
