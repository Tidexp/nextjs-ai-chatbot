import { auth } from '@/app/(auth)/auth';
import { instructorSource } from '@/lib/db/schema';
import { generateText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { drizzle } from 'drizzle-orm/postgres-js';
import { inArray, eq, and } from 'drizzle-orm';
import postgres from 'postgres';
import { NextResponse } from 'next/server';

// biome-ignore lint: this API requires database access and POSTGRES_URL is expected to be set
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const MAX_SOURCE_CHARS = 8000;

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
  const model: string = typeof body.model === 'string' ? body.model.trim() : '';

  if (sourceIds.length === 0) {
    return NextResponse.json(
      { error: 'No sources selected for mind map generation' },
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

  const prompt = `You are an educational content organizer. Create a hierarchical mind map from the learning materials below. Organize concepts logically with clear relationships.

Materials:
${contextBlocks.join('\n\n---\n\n')}

Create a mind map with the following structure:
- Layout and Orientation: Structure the mind map as a horizontal tree, where the Central topic (root node) is on the left and the branches extend to the right.
- Central topic (root node): One main topic.
- Main branches: 3 major concepts extending from the root.
- Sub-branches: 2-4 details extending from each main branch.
- Detail Level: Restrict the depth to a maximum of 3 levels (Root -> Main Branch -> Sub-branch).
- Labels: Keep all node labels concise (2-5 words).
- Functionality: Each node should be expandable/collapsible.

Output JSON ONLY in this shape:
{
  "title": string,
  "root": {
    "id": string,
    "label": string,
    "children": [
      {
        "id": string,
        "label": string,
        "children": [
          {
            "id": string,
            "label": string,
            "children": []
          }
        ]
      }
    ]
  }
}
`;

  const modelFallbacks = model
    ? [model, 'gemini-2.5-flash', 'gemini-2.5-flash-lite']
    : (['gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const);
  let text: string | null = null;

  for (const m of modelFallbacks) {
    try {
      const result = await generateText({
        model: myProvider.languageModel(m),
        prompt,
      });
      text = result.text;
      break;
    } catch (err: any) {
      console.warn(`[MindMap] Failed with model ${m}:`, err.message);
      if (m === modelFallbacks[modelFallbacks.length - 1]) {
        return NextResponse.json(
          { error: 'All models failed to generate mind map' },
          { status: 500 },
        );
      }
    }
  }

  if (!text) {
    return NextResponse.json({ error: 'No text generated' }, { status: 500 });
  }

  const parsed = extractJson(text);
  if (!parsed || !parsed.root) {
    return NextResponse.json(
      { error: 'Invalid mind map structure from model' },
      { status: 500 },
    );
  }

  return NextResponse.json(parsed);
}
