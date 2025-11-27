import {
  getTopicBySlug,
  getModulesAndLessonsByTopicId,
} from '@/lib/db/queries';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';

// Enable dynamic rendering but with caching
export const dynamic = 'force-static';
export const revalidate = 300; // Revalidate every 5 minutes

// Cache the modules and lessons data for 5 minutes
const getCachedModulesAndLessons = unstable_cache(
  async (topicId: string) => {
    return await getModulesAndLessonsByTopicId(topicId);
  },
  ['modules-and-lessons'],
  {
    revalidate: 300, // 5 minutes
    tags: ['topic-modules'],
  },
);

export default async function TopicPage({
  params,
}: { params: { slug: string } }) {
  const { slug } = (await params) as { slug: string };

  const topic = await getTopicBySlug(slug);
  if (!topic) return <div>Not found</div>;

  let modulesAndLessons: any[] = [];
  try {
    modulesAndLessons = await getCachedModulesAndLessons(topic.id);
  } catch (err) {
    console.error('Failed to load modules for topic', topic.id, err);
    modulesAndLessons = [];
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Back Navigation */}
      <Link
        href="/topics"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M19 12H5M12 19l-7-7 7-7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Topics
      </Link>

      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-8 shadow-lg">
        <div className="absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_30%_25%,white,transparent_70%)] bg-[url('/grid.svg')] bg-center bg-cover" />
        <div className="relative flex items-center gap-6">
          <div className="w-20 h-20 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl font-bold transition-transform group-hover:rotate-3">
            {topic.title?.charAt(0) ?? 'T'}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold leading-tight bg-gradient-to-r from-white via-sky-100 to-indigo-200 bg-clip-text text-transparent">
              {topic.title}
            </h1>
            <p className="mt-2 text-indigo-100/90 max-w-2xl text-sm md:text-base">
              {topic.description ??
                'A curated set of modules and lessons to learn this topic.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-medium">
                <svg
                  className="w-4 h-4 opacity-90"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M12 6v6l4 2"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {modulesAndLessons.length} modules
              </span>
              <Link
                href="#modules"
                className="inline-flex items-center gap-1 rounded-md bg-white text-indigo-700 px-3 py-1.5 text-xs md:text-sm font-semibold shadow-sm hover:opacity-95 transition"
              >
                Browse modules
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M5 12h14M12 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Modules grid */}
      <section
        id="modules"
        className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
      >
        {modulesAndLessons.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-600">
            No modules found yet.
          </div>
        ) : (
          modulesAndLessons.map((mod: any) => (
            <article
              key={mod.id}
              className="group relative overflow-hidden bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition flex flex-col justify-between border border-slate-100 hover:border-indigo-300/40"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-60 transition bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-violet-500/10" />
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                      {mod.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {mod.lessons.length} lessons
                    </p>
                  </div>
                  <div className="text-sm text-slate-400">
                    {mod.estimatedTime ?? ''}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {mod.lessons.slice(0, 6).map((lesson: any) => (
                    <span
                      key={lesson.id}
                      className="inline-flex items-center gap-2 bg-slate-50 text-slate-700 px-3 py-1 rounded-full text-sm"
                    >
                      <svg
                        className="w-3 h-3 text-indigo-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M12 5v14"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {lesson.title}
                    </span>
                  ))}
                  {mod.lessons.length > 6 && (
                    <span className="inline-flex items-center bg-slate-50 text-slate-500 px-3 py-1 rounded-full text-sm">
                      +{mod.lessons.length - 6} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 relative">
                <div className="flex items-center justify-between gap-4">
                  <Link
                    href={`/topics/${slug}/modules/${mod.id}`}
                    className="inline-flex items-center justify-center w-32 rounded-md bg-indigo-600 text-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-indigo-700 transition"
                  >
                    Start module
                  </Link>
                  <div className="w-24 text-end text-xs text-slate-400">
                    <span className="whitespace-nowrap">
                      Difficulty: {mod.difficulty ?? 'Medium'}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
