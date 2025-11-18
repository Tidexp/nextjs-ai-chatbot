import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { topicLesson, topicModule, topic } from '@/lib/db/schema';
import { getAllLessons } from '@/lib/content/loader';
import { eq } from 'drizzle-orm';

/**
 * Sync script to create/update database lessons from markdown files
 * Run with: pnpm tsx scripts/sync-lessons-from-markdown.ts
 */

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is required');
}

const client = postgres(process.env.POSTGRES_URL);
const db = drizzle(client);

// Map markdown lesson IDs to their module TITLES (DB uses UUIDs)
const lessonToModuleTitleMap: Record<string, string> = {
  // HTML Fundamentals
  les_html_01: 'HTML Fundamentals',
  les_html_02: 'HTML Fundamentals',
  les_html_03: 'HTML Fundamentals',
  les_html_04: 'HTML Fundamentals',

  // CSS Styling
  les_css_01: 'CSS Styling',
  les_css_02: 'CSS Styling',
  les_css_03: 'CSS Styling',
  les_css_04: 'CSS Styling',
  les_css_05: 'CSS Styling',

  // JavaScript Basics
  les_js_01: 'JavaScript Basics',
  les_js_02: 'JavaScript Basics',
  les_js_03: 'JavaScript Basics',
  les_js_04: 'JavaScript Basics',
};

async function syncLessons() {
  console.log('🔄 Syncing lessons from markdown to database...\n');

  try {
    // 1. Verify topic exists
    const [webDevTopic] = await db
      .select()
      .from(topic)
      .where(eq(topic.slug, 'web-development'))
      .limit(1);

    if (!webDevTopic) {
      console.error('❌ Topic "web-development" not found in database.');
      console.log(
        '💡 Please seed topics first using the /api/seed-topics endpoint\n',
      );
      process.exit(1);
    }

    console.log(`✅ Found topic: ${webDevTopic.title} (${webDevTopic.id})\n`);

    // 2. Verify modules exist
    const modules = await db
      .select()
      .from(topicModule)
      .where(eq(topicModule.topicId, webDevTopic.id));

    if (modules.length === 0) {
      console.error('❌ No modules found for web-development topic.');
      console.log('💡 Please seed modules first\n');
      process.exit(1);
    }

    console.log(`✅ Found ${modules.length} modules:`);
    for (const mod of modules) {
      console.log(`   - ${mod.title} (${mod.id})`);
    }
    console.log();

    // 3. Load all lessons from markdown
    const markdownLessons = getAllLessons();
    console.log(
      `📚 Found ${markdownLessons.length} lessons in markdown files\n`,
    );

    // 4. Sync each lesson
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const lesson of markdownLessons) {
      const moduleTitle = lessonToModuleTitleMap[lesson.id];

      if (!moduleTitle) {
        console.log(`⚠️  Skipping ${lesson.id} - no module mapping found`);
        skipped++;
        continue;
      }

      // Find module by title
      const module = modules.find((m) => m.title === moduleTitle);

      if (!module) {
        console.log(
          `⚠️  Skipping ${lesson.id} - module "${moduleTitle}" not found`,
        );
        skipped++;
        continue;
      }

      // Check if lesson already exists by moduleId + title
      const [existing] = await db
        .select()
        .from(topicLesson)
        .where(eq(topicLesson.moduleId, module.id))
        .then((lessons) => lessons.filter((l) => l.title === lesson.title));

      if (existing) {
        // Update existing lesson (found by moduleId + title match)
        await db
          .update(topicLesson)
          .set({
            type: lesson.type,
            order: lesson.order || 1,
            estimatedMinutes: lesson.estimatedMinutes || 30,
            content: `Learn ${lesson.title}`, // Keep DB content minimal
            starterCode: lesson.starterCode || null,
            language: lesson.language || null,
            exercisePrompt: lesson.exercisePrompt || null,
            projectBrief: lesson.projectBrief || null,
          })
          .where(eq(topicLesson.id, existing.id));

        console.log(
          `✏️  Updated: ${existing.id} - ${lesson.title} (matched by title)`,
        );
        updated++;
      } else {
        // Create new lesson with auto-generated UUID
        const [newLesson] = await db
          .insert(topicLesson)
          .values({
            moduleId: module.id,
            order: lesson.order || 1,
            title: lesson.title,
            type: lesson.type,
            content: `Learn ${lesson.title}`, // Minimal DB content
            estimatedMinutes: lesson.estimatedMinutes || 30,
            starterCode: lesson.starterCode || null,
            language: lesson.language || null,
            exercisePrompt: lesson.exercisePrompt || null,
            projectBrief: lesson.projectBrief || null,
            tests: null,
          } as any)
          .returning();

        console.log(`✨ Created: ${newLesson.id} - ${lesson.title}`);
        created++;
      }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`   ✨ Created: ${created}`);
    console.log(`   ✏️  Updated: ${updated}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   📚 Total: ${markdownLessons.length}\n`);

    console.log('✅ Sync complete! Lessons are now in the database.\n');
    console.log(
      '💡 The markdown content will be automatically merged when pages load.\n',
    );
  } catch (error) {
    console.error('❌ Error syncing lessons:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

syncLessons();
