import { notFound } from 'next/navigation';
import {
  getTopicBySlug,
  getModulesAndLessonsByTopicId,
  trackLessonProgress,
} from '@/lib/db/queries';
import { getLessonById } from '@/lib/content/loader';
import { auth } from '@/app/(auth)/auth';
import LessonContent from './lesson-content';
import { unstable_cache } from 'next/cache';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
export const revalidate = 300;

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

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; moduleId: string; lessonId: string }>;
}) {
  const { slug, moduleId, lessonId } = await params;
  const session = await auth();
  if (!session?.user) return notFound();

  const topic = await getTopicBySlug(slug);
  if (!topic) return notFound();

  const modulesAndLessons = await getCachedModulesAndLessons(topic.id);
  const currentModule = modulesAndLessons.find((m) => m.id === moduleId);
  if (!currentModule) return notFound();

  const currentLesson = currentModule.lessons.find((l) => l.id === lessonId);
  if (!currentLesson) return notFound();

  // Try to load rich content from Markdown files
  // Pass both ID and title to support UUID-based DB lessons
  const markdownContent = getLessonById(currentLesson.id, currentLesson.title);

  // Merge markdown content with database lesson if available
  // Keep DB title/type as the source of truth for naming and flows;
  // use Markdown for rich content and optional metadata.
  const enrichedLesson = markdownContent
    ? {
        ...currentLesson,
        content: markdownContent.content, // rich HTML from markdown
        starterCode:
          markdownContent.metadata.starterCode || currentLesson.starterCode,
        language: markdownContent.metadata.language || currentLesson.language,
        exercisePrompt:
          markdownContent.metadata.exercisePrompt ||
          currentLesson.exercisePrompt,
        projectBrief:
          markdownContent.metadata.projectBrief || currentLesson.projectBrief,
      }
    : currentLesson;

  // Track lesson access for progress
  await trackLessonProgress({
    userId: session.user.id,
    lessonId: currentLesson.id,
  });

  // Find next/prev lessons
  let prevLesson: any = null;
  let nextLesson: any = null;
  let foundCurrent = false;

  for (const module of modulesAndLessons) {
    for (const lesson of module.lessons) {
      if (foundCurrent) {
        nextLesson = { ...lesson, moduleId: module.id };
        break;
      }
      if (lesson.id === lessonId) {
        foundCurrent = true;
      } else {
        prevLesson = { ...lesson, moduleId: module.id };
      }
    }
    if (nextLesson) break;
  }

  return (
    <LessonContent
      topic={topic}
      currentModule={currentModule}
      currentLesson={enrichedLesson}
      modulesAndLessons={modulesAndLessons}
      session={session}
      navigation={{
        slug,
        moduleId,
        prevLesson,
        nextLesson,
      }}
    />
  );
}
