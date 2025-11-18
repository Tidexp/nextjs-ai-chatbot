import { getTopicBySlug, getModulesAndLessonsByTopicId } from '@/lib/db/queries';

export default async function TopicPage({
  params,
}: { params: { slug: string } }) {

  const { slug } = await params as { slug: string };

  const topic = await getTopicBySlug(slug);
  if (!topic) return <div>Not found</div>;

  let modulesAndLessons: any[] = [];
  try {
    modulesAndLessons = await getModulesAndLessonsByTopicId(topic.id);
  } catch (err) {
    console.error('Failed to load modules for topic', topic.id, err);
    modulesAndLessons = [];
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Hero */}
      <header className="rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600 text-white p-8 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold">
            {topic.title?.charAt(0) ?? 'T'}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold leading-tight">{topic.title}</h1>
            <p className="mt-1 text-sky-100 max-w-2xl">
              {topic.description ?? 'A curated set of modules and lessons to learn this topic.'}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-sm">
                <svg className="w-4 h-4 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 6v6l4 2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {modulesAndLessons.length} modules
              </span>
              <a href="#modules" className="inline-flex items-center rounded-md bg-white text-indigo-700 px-3 py-1.5 text-sm font-semibold shadow-sm hover:opacity-95">
                Browse modules
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Modules grid */}
      <section id="modules" className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {modulesAndLessons.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-600">
            No modules found yet.
          </div>
        ) : (
          modulesAndLessons.map((mod: any) => (
            <article
              key={mod.id}
              className="bg-white rounded-2xl p-5 shadow hover:shadow-lg transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{mod.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{mod.lessons.length} lessons</p>
                  </div>
                  <div className="text-sm text-slate-400">{mod.estimatedTime ?? ''}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {mod.lessons.slice(0, 6).map((lesson: any) => (
                    <span
                      key={lesson.id}
                      className="inline-flex items-center gap-2 bg-slate-50 text-slate-700 px-3 py-1 rounded-full text-sm"
                    >
                      <svg className="w-3 h-3 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between gap-4">
                  <a
                    href={`/topics/${slug}/modules/${mod.id}`}
                    className="inline-flex items-center justify-center w-32 rounded-md bg-indigo-600 text-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-indigo-700"
                  >
                    Start module
                  </a>
                  <div className="w-24 text-end text-xs text-slate-400">
                    <span className="whitespace-nowrap">Difficulty: {mod.difficulty ?? 'Medium'}</span>
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
