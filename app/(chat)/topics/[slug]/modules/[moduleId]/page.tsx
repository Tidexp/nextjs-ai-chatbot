import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTopicBySlug, getModulesAndLessonsByTopicId } from '@/lib/db/queries';

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string; moduleId: string }>;
}) {
  // Get topic and module data
  const { slug, moduleId } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) return notFound();

  const modulesAndLessons = await getModulesAndLessonsByTopicId(topic.id);
  const currentModule = modulesAndLessons.find(m => m.id === moduleId);
  if (!currentModule) return notFound();

  const moduleIndex = modulesAndLessons.findIndex(m => m.id === moduleId);
  const prevModule = moduleIndex > 0 ? modulesAndLessons[moduleIndex - 1] : null;
  const nextModule = moduleIndex < modulesAndLessons.length - 1 ? modulesAndLessons[moduleIndex + 1] : null;

  // Calculate progress
  const totalLessons = currentModule.lessons.length;
  const completedLessons = 0; // TODO: Track completion in DB
  const progress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-slate-600">
        <Link href={`/topics/${slug}`} className="hover:text-slate-800">
          {topic.title}
        </Link>
        <span>/</span>
        <span className="text-slate-950 font-medium">{currentModule.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{currentModule.title}</h1>
              <div className="flex items-center gap-2">
                <div className="text-sm text-slate-600">Module {moduleIndex + 1} of {modulesAndLessons.length}</div>
              </div>
            </div>

            {/* Learning objectives */}
            {currentModule.learningObjectives && currentModule.learningObjectives.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-3">Learning Objectives</h2>
                <ul className="space-y-2">
                  {currentModule.learningObjectives.map((objective, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700">
                      <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lesson list */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Lessons</h2>
              <div className="space-y-3">
                {currentModule.lessons.map((lesson, i) => (
                  <Link 
                    key={lesson.id}
                    href={`/topics/${slug}/modules/${moduleId}/lessons/${lesson.id}`}
                    className="group block"
                  >
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                        {i + 1}
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-medium text-slate-900 group-hover:text-indigo-600">{lesson.title}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)} • {lesson.estimatedMinutes} min
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-8">
            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Your Progress</h3>
                <span className="text-sm text-slate-600">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {completedLessons} of {totalLessons} lessons completed
              </p>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
              <div>
                <div className="text-sm font-medium text-slate-600">Difficulty</div>
                <div className="mt-1 text-lg font-semibold">{currentModule.difficulty || 'Beginner'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-600">Est. Time</div>
                <div className="mt-1 text-lg font-semibold">{currentModule.estimated_hours || 2}h</div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-6 space-y-3">
              {prevModule && (
                <Link
                  href={`/topics/${slug}/modules/${prevModule.id}`}
                  className="flex items-center gap-2 text-slate-600 hover:text-indigo-600"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Previous: {prevModule.title}
                </Link>
              )}
              {nextModule && (
                <Link
                  href={`/topics/${slug}/modules/${nextModule.id}`}
                  className="flex items-center justify-end gap-2 text-slate-600 hover:text-indigo-600"
                >
                  {nextModule.title}
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}