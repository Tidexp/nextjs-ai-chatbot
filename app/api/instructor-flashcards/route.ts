import { auth } from '@/app/(auth)/auth';
import { instructorSource } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';
import { generateText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { drizzle } from 'drizzle-orm/postgres-js';
import { inArray, eq, and } from 'drizzle-orm';
import postgres from 'postgres';
import { NextResponse } from 'next/server';

// biome-ignore lint: this API requires database access and POSTGRES_URL is expected to be set
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const MAX_SOURCE_CHARS = 6000;

const sanitize = (
  text: string | null | undefined,
  limit = MAX_SOURCE_CHARS,
) => {
  if (!text) return '';
  return text.replace(/\0/g, '').slice(0, limit);
};

const extractJson = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const match = raw.match(/```json\s*([\s\S]*?)```/i);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (err) {
        return null;
      }
    }
    return null;
  }
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sourceIds: string[] = Array.isArray(body.sourceIds)
    ? body.sourceIds
    : [];
  const count = Math.min(Math.max(body.count ?? 10, 5), 50);
  const userFocus: string =
    typeof body.userFocus === 'string' ? body.userFocus.trim() : '';
  const difficulty: string = ['easy', 'medium', 'hard'].includes(
    (body.difficulty || '').toLowerCase(),
  )
    ? body.difficulty.toLowerCase()
    : 'medium';
  const model: string = typeof body.model === 'string' ? body.model.trim() : '';

  if (sourceIds.length === 0) {
    return NextResponse.json(
      { error: 'No sources selected for flashcard generation' },
      { status: 400 },
    );
  }

  const sources = await db
    .select()
    .from(instructorSource)
    .where(
      and(
        inArray(instructorSource.id, sourceIds),
        eq(instructorSource.userId, session.user.id as string),
      ),
    );

  if (sources.length === 0) {
    return NextResponse.json({ error: 'Sources not found' }, { status: 404 });
  }

  const contextBlocks = sources.map(
    (s: (typeof instructorSource)['$inferSelect']) => {
      const content =
        sanitize(s.content) || sanitize(s.excerpt) || 'No content';
      return `Title: ${s.title}\nType: ${s.type}\nContent:\n${content}`;
    },
  );

  const prompt = `You are an instructional designer. Create a flashcard deck from the material below. Each card should have a clear front (question/prompt) and back (answer) based strictly on the provided content. Do NOT invent facts.\n\nMaterials:\n${contextBlocks.join('\n\n---\n\n')}\n\nFlashcard requirements:\n- Cards: ${count}\n- Difficulty: ${difficulty}\n- Format: Clear, concise Q&A pairs suitable for studying\n- Avoid single-word answers; provide complete, helpful responses\n${userFocus ? `- Focus: ${userFocus}\n` : ''}\nOutput JSON ONLY in this shape:\n{\n  "title": string,\n  "cards": [\n    {\n      "id": string,\n      "front": string,\n      "back": string\n    }\n  ]\n}\n`;

  const modelFallbacks = model
    ? [model, 'gemini-2.5-flash', 'gemini-2.5-flash-lite']
    : (['gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const);
  let text: string | null = null;
  let lastError: unknown = null;

  for (const modelId of modelFallbacks) {
    try {
      const result = await generateText({
        model: myProvider.languageModel(modelId),
        prompt,
        temperature: 0.3,
        maxTokens: 2000,
      } as any);
      text = result.text;
      break;
    } catch (error: any) {
      lastError = error;
      const isOverloaded =
        error?.status === 503 ||
        error?.code === 503 ||
        (typeof error?.message === 'string' &&
          error.message.toLowerCase().includes('overloaded'));

      if (!isOverloaded) {
        return NextResponse.json(
          { error: 'Failed to generate flashcards' },
          { status: 500 },
        );
      }
      // Try next fallback model
    }
  }

  if (!text) {
    console.error('Flashcard generation failed after fallbacks:', lastError);
    return NextResponse.json(
      { error: 'Model temporarily unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }

  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.cards)) {
    return NextResponse.json(
      { error: 'Failed to generate flashcards' },
      { status: 500 },
    );
  }

  const deckId = generateUUID();
  const cards = parsed.cards
    .slice(0, count)
    .map((c: any, idx: number) => ({
      id: c.id || `${deckId}-card${idx + 1}`,
      front: String(c.front || '').trim(),
      back: String(c.back || '').trim(),
    }))
    .filter((c: any) => c.front && c.back);

  if (cards.length === 0) {
    return NextResponse.json(
      { error: 'Flashcard generation returned no cards' },
      { status: 500 },
    );
  }

  const deck = {
    id: deckId,
    title: parsed.title || 'Study Deck',
    sourceTitles: sources.map(
      (s: (typeof instructorSource)['$inferSelect']) => s.title,
    ),
    cards,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ deck }, { status: 201 });
}
