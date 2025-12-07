import { auth } from '@/app/(auth)/auth';
import { instructorSource } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { NextResponse } from 'next/server';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Sanitize text content to remove null bytes and other invalid UTF-8 sequences
 * that PostgreSQL cannot handle
 */
function sanitizeText(text: string | null | undefined): string | null {
  if (!text) return null;

  // Remove null bytes and control characters using char codes
  // Keeps newlines (\n = 10) and tabs (\t = 9)
  return text
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      // Keep printable chars (32+), newlines (10), tabs (9), and carriage returns (13)
      return code === 9 || code === 10 || code === 13 || code >= 32;
    })
    .join('')
    .trim();
}

// GET all sources for the current user
export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sources = await db
      .select()
      .from(instructorSource)
      .where(eq(instructorSource.userId, session.user.id as string))
      .orderBy(desc(instructorSource.createdAt));

    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 },
    );
  }
}

// POST create a new source
export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, type, excerpt, content, sourceUrl, metadata } = body;

    // Sanitize text fields to remove null bytes and control characters
    const sanitizedContent = sanitizeText(content);
    const sanitizedExcerpt = sanitizeText(excerpt);
    const sanitizedTitle = sanitizeText(title) || 'Untitled';

    const [newSource] = await db
      .insert(instructorSource)
      .values({
        userId: session.user.id as string,
        title: sanitizedTitle,
        type,
        excerpt: sanitizedExcerpt,
        content: sanitizedContent,
        sourceUrl: sourceUrl || null,
        metadata: metadata || null,
      })
      .returning();

    return NextResponse.json(newSource);
  } catch (error) {
    console.error('Error creating source:', error);
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 },
    );
  }
}

// DELETE a source
export async function DELETE(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('id');

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID required' },
        { status: 400 },
      );
    }

    await db
      .delete(instructorSource)
      .where(
        and(
          eq(instructorSource.id, sourceId),
          eq(instructorSource.userId, session.user.id as string),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json(
      { error: 'Failed to delete source' },
      { status: 500 },
    );
  }
}
