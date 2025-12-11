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
  const numQuestions = Math.min(Math.max(body.numQuestions ?? 5, 3), 12);
  const userFocus: string =
    typeof body.userFocus === 'string' ? body.userFocus.trim() : '';
  const difficulty: string = ['easy', 'medium', 'hard'].includes(
    (body.difficulty || '').toLowerCase(),
  )
    ? body.difficulty.toLowerCase()
    : 'medium';
  const lengthHint: string = ['short', 'medium', 'long'].includes(
    (body.lengthHint || '').toLowerCase(),
  )
    ? body.lengthHint.toLowerCase()
    : 'medium';

  if (sourceIds.length === 0) {
    return NextResponse.json(
      { error: 'No sources selected for test generation' },
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

  const prompt = `You are an instructional designer. Create a multiple-choice quiz strictly using the material below. Do NOT invent facts. Prefer clear textual statements over vague "image shows" language; if image OCR is present, use that extracted text.\n\nMaterials (text first, then OCR if any):\n${contextBlocks.join('\n\n---\n\n')}\n\nQuiz requirements:\n- Questions: ${numQuestions}\n- Difficulty: ${difficulty}\n- Length: ${lengthHint} questions with concise phrasing.\n- Each question has exactly 4 options.\n- Provide a helpful, text-based explanation tied to the material (avoid "image shows" phrasing).\n${userFocus ? `- Focus: ${userFocus}\n` : ''}- correctIndex is zero-based.\n\nOutput JSON ONLY in this shape:\n{\n  "title": string,\n  "questions": [\n    {\n      "id": string,\n      "question": string,\n      "options": [string, string, string, string],\n      "correctIndex": number,\n      "explanation": string\n    }\n  ]\n}\n`;

  const modelFallbacks = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const;
  let text: string | null = null;
  let lastError: unknown = null;

  for (const modelId of modelFallbacks) {
    try {
      const result = await generateText({
        model: myProvider.languageModel(modelId),
        prompt,
        temperature: 0.3,
        maxTokens: 800,
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
          { error: 'Failed to generate quiz' },
          { status: 500 },
        );
      }
      // Try next fallback model
    }
  }

  if (!text) {
    console.error('Quiz generation failed after fallbacks:', lastError);
    return NextResponse.json(
      { error: 'Model temporarily unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }

  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.questions)) {
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 },
    );
  }

  const testId = generateUUID();
  const questions = parsed.questions
    .slice(0, numQuestions)
    .map((q: any, idx: number) => ({
      id: q.id || `${testId}-q${idx + 1}`,
      question: String(q.question || '').trim(),
      options: Array.isArray(q.options)
        ? q.options.slice(0, 4).map(String)
        : [],
      correctIndex:
        typeof q.correctIndex === 'number' &&
        q.correctIndex >= 0 &&
        q.correctIndex < 4
          ? q.correctIndex
          : 0,
      explanation: String(q.explanation || '').trim(),
    }))
    .filter((q: any) => q.question && q.options.length === 4);

  if (questions.length === 0) {
    return NextResponse.json(
      { error: 'Quiz generation returned no questions' },
      { status: 500 },
    );
  }

  const test = {
    id: testId,
    title: parsed.title || 'Knowledge Check',
    sourceTitles: sources.map(
      (s: (typeof instructorSource)['$inferSelect']) => s.title,
    ),
    questions,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ test }, { status: 201 });
}
