'use client';

import Link from 'next/link';
import type { Session } from 'next-auth';
import { ExercisePanel } from '@/components/exercise-panel';
import { LessonChat } from '@/components/lesson-chat';
import { useEffect } from 'react';

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
      className={`w-full text-left px-4 py-2 text-sm hover:bg-[#04AA6D] hover:text-white transition-colors
        ${active ? 'bg-[#04AA6D] text-white' : 'text-slate-700'}`}
    >
      {children}
    </button>
  );
}

function LessonNav({ prevLesson, nextLesson, slug, moduleId }: Navigation) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
      {prevLesson ? (
        <Link
          href={`/topics/${slug}/modules/${prevLesson.moduleId}/lessons/${prevLesson.id}`}
          className="flex items-center gap-2 text-slate-600 hover:text-[#04AA6D] transition-colors"
        >
          <svg
            className="w-5 h-5"
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
          Previous: {prevLesson.title}
        </Link>
      ) : (
        <div />
      )}

      {nextLesson ? (
        <Link
          href={`/topics/${slug}/modules/${nextLesson.moduleId}/lessons/${nextLesson.id}`}
          className="flex items-center gap-2 text-slate-600 hover:text-[#04AA6D] transition-colors"
        >
          Next: {nextLesson.title}
          <svg
            className="w-5 h-5"
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
          className="flex items-center gap-2 text-slate-600 hover:text-[#04AA6D] transition-colors"
        >
          Back to Module Overview
          <svg
            className="w-5 h-5"
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

export default function LessonContent(props: LessonContentProps) {
  const {
    topic,
    currentModule,
    currentLesson,
    modulesAndLessons,
    session,
    navigation,
  } = props;
  const { slug, moduleId } = navigation;
  const content = currentLesson.content || '';
  const exercisePrompt = currentLesson.exercisePrompt || '';
  const projectBrief = currentLesson.projectBrief || '';
  const starterCode = currentLesson.starterCode?.toString() || '';
  const language = currentLesson.language?.toString() || 'javascript';

  useEffect(() => {
    // ensure focus at top when switching lessons
    window.scrollTo({ top: 0, behavior: 'auto' });
    // optional: focus main heading for a11y
    const h = document.querySelector('[data-lesson-top]');
    if (h instanceof HTMLElement) h.focus();
  }, [currentLesson.id]);

  return (
    <div className="min-h-screen bg-[#E7E9EB]">
      {/* Top navigation bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-[#d4d4d4]">
        <div className="max-w-screen-2xl mx-auto px-4">
          <nav className="flex items-center h-[56px] gap-4">
            <Link
              href={`/topics/${slug}`}
              className="text-black hover:bg-[#04AA6D] hover:text-white px-4 py-2 rounded transition-colors"
            >
              {topic.title}
            </Link>
            <Link
              href={`/topics/${slug}/modules/${moduleId}`}
              className="text-black hover:bg-[#04AA6D] hover:text-white px-4 py-2 rounded transition-colors"
            >
              {currentModule.title}
            </Link>
            <span className="flex-grow" />
            <button
              type="button"
              className="bg-black text-white px-4 py-2 rounded hover:bg-[#04AA6D] transition-colors"
            >
              ❤️ Support Us
            </button>
          </nav>
        </div>
      </div>

      {/* Main content layout */}
      <div className="max-w-screen-2xl mx-auto grid grid-cols-[250px_1fr] gap-0">
        {/* Left sidebar */}
        <div className="bg-white border-r border-[#d4d4d4] min-h-[calc(100vh-56px)] p-4">
          <div className="font-bold mb-4">Topic Content</div>
          <div className="space-y-1">
            {modulesAndLessons.map((module) => (
              <div key={module.id}>
                <div className="font-semibold text-sm py-2">{module.title}</div>
                {module.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/topics/${slug}/modules/${module.id}/lessons/${lesson.id}`}
                  >
                    <SideMenuButton active={lesson.id === currentLesson.id}>
                      {lesson.title}
                    </SideMenuButton>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="p-8 min-h-[calc(100vh-56px)]">
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {/* Tutorial content */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <h1
                  className="text-3xl font-bold mb-4 text-slate-900"
                  data-lesson-top
                  tabIndex={-1}
                >
                  {currentLesson.title}
                </h1>

                {/* Lesson rich content (render for all lesson types if available) */}
                {content && (
                  <div className="mt-4 text-slate-700 leading-relaxed prose prose-slate max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                  </div>
                )}
              </div>
            </div>

            {/* Interactive exercises */}
            {(currentLesson.type === 'exercise' ||
              currentLesson.type === 'practice') && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-[#E7E9EB] border-b border-[#d4d4d4] p-3">
                  <h2 className="text-xl font-semibold">Exercise</h2>
                </div>
                <div className="p-6">
                  <div className="mb-6 p-4 bg-[#FFF4A3] rounded-md">
                    <h3 className="font-semibold mb-2">Task:</h3>
                    <p className="text-slate-800">
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
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-[#E7E9EB] border-b border-[#d4d4d4] p-3">
                  <h2 className="text-xl font-semibold">Project</h2>
                </div>
                <div className="p-6">
                  <div className="mb-6 p-4 bg-[#FFF4A3] rounded-md">
                    <h3 className="font-semibold mb-2">Project Brief:</h3>
                    <p className="text-slate-800">{projectBrief}</p>
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
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#E7E9EB] border-b border-[#d4d4d4] p-3">
                <h2 className="text-xl font-semibold">Get Help</h2>
              </div>
              <div className="p-4">
                <LessonChat
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
