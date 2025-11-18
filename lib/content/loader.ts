// use to load and parse lesson markdown files from the content directory
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

// Configure marked for better code highlighting and security
marked.use({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
});

export interface LessonMetadata {
  id: string;
  title: string;
  type:
    | 'introduction'
    | 'theory'
    | 'exercise'
    | 'practice'
    | 'project'
    | 'quiz';
  estimatedMinutes?: number;
  order?: number;
  starterCode?: string;
  language?: string;
  exercisePrompt?: string;
  projectBrief?: string;
}

export interface LessonContent {
  metadata: LessonMetadata;
  content: string; // HTML content
  rawContent: string; // Original Markdown
}

// Support both legacy flat structure and new nested topic/module/lesson structure
const LEGACY_CONTENT_DIR = path.join(process.cwd(), 'content', 'lessons');
const TOPICS_CONTENT_DIR = path.join(process.cwd(), 'content', 'topics');

function isMarkdownFile(file: string) {
  return file.toLowerCase().endsWith('.md');
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkDir(full));
    } else if (stat.isFile() && isMarkdownFile(full)) {
      results.push(full);
    }
  }
  return results;
}

function parseLessonFile(fullPath: string): LessonContent | null {
  try {
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    // Minimal validation: must have an id and title in frontmatter
    if (!data || !data.id) return null;
    const htmlContent = marked.parse(content) as string;
    return {
      metadata: data as LessonMetadata,
      content: htmlContent,
      rawContent: content,
    };
  } catch (e) {
    console.warn('[parseLessonFile] failed for', fullPath, e);
    return null;
  }
}

// Normalize titles to improve matching robustness (handle &, punctuation, spacing, casing)
function normalizeTitle(input: string | undefined | null): string {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ') // remove punctuation
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
}

function titlesMatch(a?: string, b?: string): boolean {
  return normalizeTitle(a) === normalizeTitle(b);
}

/**
 * Get a single lesson by filename (slug)
 * @param slug - The filename without .md extension (e.g., 'html-introduction')
 */
export function getLessonBySlug(slug: string): LessonContent | null {
  try {
    // Search across new nested structure first, then legacy as fallback
    const candidates: string[] = [];
    const topicFiles = walkDir(TOPICS_CONTENT_DIR);
    for (const file of topicFiles) {
      if (path.basename(file, '.md') === slug) candidates.push(file);
    }
    if (candidates.length === 0) {
      const legacyPath = path.join(LEGACY_CONTENT_DIR, `${slug}.md`);
      if (fs.existsSync(legacyPath)) candidates.push(legacyPath);
    }
    if (candidates.length === 0) {
      console.warn(`[getLessonBySlug] No lesson file found for slug: ${slug}`);
      return null;
    }
    // Prefer the first match (nested structure prioritized)
    return parseLessonFile(candidates[0]);
  } catch (error) {
    console.error(`Error loading lesson by slug ${slug}:`, error);
    return null;
  }
}

/**
 * Get lesson by database ID or title
 * Since DB uses UUIDs but markdown uses custom IDs, we try both approaches:
 * 1. Match by frontmatter ID (for legacy compatibility)
 * 2. Match by title (for UUID-based DB lessons)
 */
export function getLessonById(
  lessonIdOrTitle: string,
  lessonTitle?: string,
): LessonContent | null {
  // Search nested topics structure first
  const topicFiles = walkDir(TOPICS_CONTENT_DIR);
  for (const file of topicFiles) {
    const parsed = parseLessonFile(file);
    if (!parsed) continue;

    // Try matching by frontmatter ID (e.g., les_html_02)
    if (parsed.metadata.id === lessonIdOrTitle) return parsed;

    // Try matching by title (for UUID-based DB lessons)
    if (lessonTitle && titlesMatch(parsed.metadata.title, lessonTitle))
      return parsed;
  }

  // Fallback to legacy flat structure
  const legacyFiles = walkDir(LEGACY_CONTENT_DIR);
  for (const file of legacyFiles) {
    const parsed = parseLessonFile(file);
    if (!parsed) continue;

    if (parsed.metadata.id === lessonIdOrTitle) return parsed;
    if (lessonTitle && titlesMatch(parsed.metadata.title, lessonTitle))
      return parsed;
  }

  console.warn(
    `[getLessonById] No markdown found for lesson ID/title: ${lessonIdOrTitle}${lessonTitle ? ` / "${lessonTitle}"` : ''}`,
  );
  return null;
}

/**
 * Get all available lesson slugs
 */
export function getAllLessonSlugs(): string[] {
  try {
    const slugs = new Set<string>();
    // Nested structure: use filename (without extension) as slug hint
    for (const file of walkDir(TOPICS_CONTENT_DIR)) {
      slugs.add(path.basename(file, '.md'));
    }
    // Legacy structure
    if (fs.existsSync(LEGACY_CONTENT_DIR)) {
      for (const file of fs.readdirSync(LEGACY_CONTENT_DIR)) {
        if (isMarkdownFile(file)) slugs.add(file.replace(/\.md$/i, ''));
      }
    }
    return Array.from(slugs);
  } catch (error) {
    console.error('Error reading lesson directory:', error);
    return [];
  }
}

/**
 * Get all lessons with their metadata (no content)
 */
export function getAllLessons(): Array<LessonMetadata & { slug: string }> {
  // Aggregate from nested structure first (stable), then legacy
  const seen = new Set<string>(); // by metadata.id
  const lessons: Array<LessonMetadata & { slug: string }> = [];

  for (const file of walkDir(TOPICS_CONTENT_DIR)) {
    const parsed = parseLessonFile(file);
    if (parsed && !seen.has(parsed.metadata.id)) {
      seen.add(parsed.metadata.id);
      lessons.push({ ...parsed.metadata, slug: path.basename(file, '.md') });
    }
  }

  for (const file of walkDir(LEGACY_CONTENT_DIR)) {
    const parsed = parseLessonFile(file);
    if (parsed && !seen.has(parsed.metadata.id)) {
      seen.add(parsed.metadata.id);
      lessons.push({ ...parsed.metadata, slug: path.basename(file, '.md') });
    }
  }

  return lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
}
