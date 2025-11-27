'use client';

import Link from 'next/link';
import type { Session } from 'next-auth';
import { ExercisePanel } from '@/components/exercise-panel';
import { LessonChat } from '@/components/lesson-chat';
import { useEffect, useMemo, memo } from 'react';

// Local lightweight types (avoid importing from shared types to prevent
// coupling and missing-export compile errors in this client component).
interface Lesson {
  id: string;
  title: string;
  type: string;
  content?: string | null;
  exercisePrompt?: string | null;
  projectBrief?: string | null;
  starterCode?: string | null;
  language?: string | null;
  tests?: unknown;
  moduleId?: string;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Navigation {
  slug: string;
  moduleId: string;
  prevLesson: {
    id: string;
    title: string;
    moduleId: string;
  } | null;
  nextLesson: {
    id: string;
    title: string;
    moduleId: string;
  } | null;
}

interface Topic {
  id: string;
  title: string;
}

interface LessonContentProps {
  topic: Topic;
  currentModule: Module;
  currentLesson: Lesson;
  modulesAndLessons: Module[];
  session: Session;
  navigation: Navigation;
}

function SideMenuButton({
  children,
  active = false,
}: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-2 text-xs md:text-sm rounded-md transition-all
        ${active ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium shadow-sm' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'}`}
    >
      {children}
    </button>
  );
}

function LessonNav({ prevLesson, nextLesson, slug, moduleId }: Navigation) {
  return (
    <div className="relative overflow-hidden bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border border-slate-100">
      <div className="absolute inset-0 opacity-40 bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-fuchsia-500/5 pointer-events-none" />
      {prevLesson ? (
        <Link
          href={`/topics/${slug}/modules/${prevLesson.moduleId}/lessons/${prevLesson.id}`}
          className="relative z-10 flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors text-sm"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M15 18l-6-6 6-6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden sm:inline">Previous:</span> {prevLesson.title}
        </Link>
      ) : (
        <div />
      )}

      {nextLesson ? (
        <Link
          href={`/topics/${slug}/modules/${nextLesson.moduleId}/lessons/${nextLesson.id}`}
          className="relative z-10 flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors text-sm"
        >
          <span className="hidden sm:inline">Next:</span> {nextLesson.title}
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M9 18l6-6-6-6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      ) : (
        <Link
          href={`/topics/${slug}/modules/${moduleId}`}
          className="relative z-10 flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors text-sm"
        >
          <span className="hidden sm:inline">Back to</span> Module Overview
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M9 18l6-6-6-6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
    </div>
  );
}

function LessonContent(props: LessonContentProps) {
  const {
    topic,
    currentModule,
    currentLesson,
    modulesAndLessons,
    session,
    navigation,
  } = props;
  const { slug, moduleId } = navigation;

  // Memoize derived values to prevent recalculation on every render
  const content = useMemo(
    () => currentLesson.content || '',
    [currentLesson.content],
  );
  const exercisePrompt = useMemo(
    () => currentLesson.exercisePrompt || '',
    [currentLesson.exercisePrompt],
  );
  const projectBrief = useMemo(
    () => currentLesson.projectBrief || '',
    [currentLesson.projectBrief],
  );
  const starterCode = useMemo(
    () => currentLesson.starterCode?.toString() || '',
    [currentLesson.starterCode],
  );
  const language = useMemo(
    () => currentLesson.language?.toString() || 'javascript',
    [currentLesson.language],
  );

  useEffect(() => {
    // Immediate scroll to top without animation
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch (e) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    // Focus main heading for accessibility
    const h = document.querySelector('[data-lesson-top]');
    if (h instanceof HTMLElement) {
      h.focus({ preventScroll: true });
    }

    // Force garbage collection hint (if supported)
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        setTimeout(() => (window as any).gc(), 100);
      } catch (e) {
        // GC not available
      }
    }

    return () => {
      // Cleanup on unmount
    };
  }, [currentLesson.id]);
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navigation bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4">
          <nav className="flex items-center h-[56px] gap-2 md:gap-4">
            <Link
              href={`/topics/${slug}`}
              className="text-slate-700 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-violet-500 hover:text-white px-3 md:px-4 py-2 rounded-md transition-all text-xs md:text-sm font-medium"
            >
              {topic.title}
            </Link>
            <svg
              className="w-3 h-3 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M9 18l6-6-6-6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <Link
              href={`/topics/${slug}/modules/${moduleId}`}
              className="text-slate-700 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-violet-500 hover:text-white px-3 md:px-4 py-2 rounded-md transition-all text-xs md:text-sm font-medium"
            >
              {currentModule.title}
            </Link>
            <span className="flex-grow" />
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <svg
                className="w-4 h-4"
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
              <span>Lesson</span>
            </div>
          </nav>
        </div>
      </div>

      {/* Main content layout */}
      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0">
        {/* Left sidebar */}
        <div className="hidden lg:block bg-white border-r border-slate-200 min-h-[calc(100vh-56px)]">
          <div className="sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
              <span className="font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Course Content
              </span>
            </div>
            <div className="space-y-4">
              {modulesAndLessons.map((module) => (
                <div key={module.id}>
                  <div className="font-semibold text-xs uppercase tracking-wide text-slate-500 py-2 px-1">
                    {module.title}
                  </div>
                  <div className="space-y-1">
                    {module.lessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        href={`/topics/${slug}/modules/${module.id}/lessons/${lesson.id}`}
                        prefetch={false}
                      >
                        <SideMenuButton active={lesson.id === currentLesson.id}>
                          {lesson.title}
                        </SideMenuButton>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="p-4 md:p-8 min-h-[calc(100vh-56px)]">
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {/* Tutorial content */}
            <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-fuchsia-500/5 [mask-image:radial-gradient(circle_at_30%_20%,white,transparent_70%)] pointer-events-none" />
              <div className="sticky top-[56px] z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 p-6 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                    <svg
                      className="w-3 h-3"
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
                    {currentLesson.type.charAt(0).toUpperCase() +
                      currentLesson.type.slice(1)}
                  </span>
                </div>
                <h1
                  className="text-2xl md:text-3xl font-bold mb-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent"
                  data-lesson-top
                  tabIndex={-1}
                >
                  {currentLesson.title}
                </h1>
              </div>
              <div className="relative p-6 pt-4">
                {/* Lesson rich content (render for all lesson types if available) */}
                {content && (
                  <div
                    className="text-slate-700 leading-relaxed prose prose-slate max-w-none"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                )}
              </div>
            </div>

            {/* Interactive exercises */}
            {(currentLesson.type === 'exercise' ||
              currentLesson.type === 'practice') && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
                <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 border-b border-slate-200 p-4">
                  <h2 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-indigo-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M9 12l2 2 4-4"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Exercise
                  </h2>
                </div>
                <div className="p-6">
                  <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-md">
                    <h3 className="font-semibold mb-2 text-amber-900 flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Task:
                    </h3>
                    <p className="text-slate-800 text-sm">
                      {exercisePrompt || content}
                    </p>
                  </div>
                  <ExercisePanel
                    title={currentLesson.title}
                    description="Write your solution below:"
                    initialCode={starterCode}
                    language={language}
                    testCases={
                      currentLesson.tests
                        ? JSON.parse(JSON.stringify(currentLesson.tests))
                        : []
                    }
                  />
                </div>
              </div>
            )}

            {/* Project section */}
            {currentLesson.type === 'project' && projectBrief && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-b border-slate-200 p-4">
                  <h2 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-emerald-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Project
                  </h2>
                </div>
                <div className="p-6">
                  <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-400 rounded-md">
                    <h3 className="font-semibold mb-2 text-emerald-900 flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Project Brief:
                    </h3>
                    <p className="text-slate-800 text-sm">{projectBrief}</p>
                  </div>
                  <ExercisePanel
                    title="Project Workspace"
                    description="Use this workspace to work on your project:"
                    initialCode={starterCode}
                    language={language}
                    testCases={[]}
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <LessonNav {...navigation} />

            {/* Chat section */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
              <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-violet-50 border-b border-slate-200 p-4">
                <h2 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-sky-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Get Help
                </h2>
              </div>
              <div className="p-4">
                <LessonChat
                  key={currentLesson.id}
                  lessonId={currentLesson.id}
                  lessonContent={content}
                  lessonType={currentLesson.type}
                  exercisePrompt={exercisePrompt}
                  projectBrief={projectBrief}
                  session={session}
                  topicId={topic.id}
                  moduleId={moduleId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(LessonContent, (prevProps, nextProps) => {
  // Only re-render if the lesson ID changes
  return prevProps.currentLesson.id === nextProps.currentLesson.id;
});
