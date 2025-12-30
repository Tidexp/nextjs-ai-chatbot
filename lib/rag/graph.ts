import { HfInference } from '@huggingface/inference';
import { generateText } from 'ai';
import { myProvider } from '@/lib/ai/providers';

import {
  type DirectedTriplet,
  type GraphEntityInput,
  storeGraphEntitiesAndRelations,
} from '@/lib/rag/db';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const NER_MODEL = 'dslim/bert-base-NER';

function sanitize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 2000) || 'placeholder';
}

function mapEntityType(raw: string): string {
  const upper = raw.toUpperCase();
  if (upper === 'PER' || upper === 'PERSON') return 'person';
  if (upper === 'ORG' || upper === 'ORGANIZATION') return 'organization';
  if (upper === 'LOC' || upper === 'LOCATION') return 'location';
  if (upper === 'MISC') return 'misc';
  return 'entity';
}

function mergeTokens(classifications: any[]): GraphEntityInput[] {
  const merged: Array<{ label: string; type: string }> = [];
  let current: { label: string; type: string } | null = null;

  for (const item of classifications) {
    const group = (item.entity_group || item.entity || '').toString();
    const word = (item.word || '').toString().replace(/^##/, '');
    if (!group || !word.trim()) continue;

    const mappedType = mapEntityType(group);
    if (current && current.type === mappedType) {
      current.label = `${current.label} ${word}`.trim();
    } else {
      if (current) merged.push(current);
      current = { label: word.trim(), type: mappedType };
    }
  }

  if (current) merged.push(current);

  const unique = Array.from(
    new Map(
      merged
        .filter((entry) => entry.label)
        .map((entry) => [
          `${entry.label.toLowerCase()}|${entry.type}`,
          { label: entry.label, type: entry.type },
        ]),
    ).values(),
  );

  return unique.map((entry) => ({
    label: entry.label,
    type: entry.type,
    canonicalLabel: entry.label.toLowerCase(),
  }));
}

function fallbackHeuristic(text: string): GraphEntityInput[] {
  const matches = text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
  const unique = Array.from(new Set(matches)).slice(0, 10);
  return unique.map((label) => ({
    label,
    type: 'entity',
    canonicalLabel: label.toLowerCase(),
  }));
}

export async function extractEntities(
  text: string,
): Promise<GraphEntityInput[]> {
  const cleaned = sanitize(text);
  try {
    const result = await hf.tokenClassification({
      model: NER_MODEL,
      inputs: cleaned,
    });

    if (!Array.isArray(result) || result.length === 0) {
      return fallbackHeuristic(cleaned);
    }

    return mergeTokens(result as any[]);
  } catch (error) {
    console.warn('NER extraction failed, using fallback:', error);
    return fallbackHeuristic(cleaned);
  }
}

/**
 * Extract directed triplets (relationships) from text using LLM.
 * Supports both Programming and Educational domains.
 */
export async function extractTriplets(
  text: string,
): Promise<DirectedTriplet[]> {
  try {
    const prompt = `Extract semantic relationships from the following text as directed triplets.

RELATIONSHIP TYPES (use these exact values):
Programming Domain:
- defines: subject defines/declares object (e.g., "Python defines classes")
- implements: subject implements object (e.g., "React implements virtual DOM")
- extends: subject extends/inherits from object (e.g., "TypeScript extends JavaScript")
- imports: subject imports/uses object (e.g., "App imports React")
- uses: subject uses object as a tool (e.g., "Function uses API")
- contains: subject contains object as a part (e.g., "Component contains Props")
- references: subject references/mentions object

Educational Domain:
- prerequisite_of: subject is a prerequisite of object (e.g., "Algebra prerequisite_of Calculus")
- explains: subject explains object (e.g., "Chapter 1 explains variables")
- follows: subject follows object in sequence (e.g., "Lesson 2 follows Lesson 1")

General:
- relates_to: general semantic relationship
- co_occurs: entities that appear together without clear direction

TEXT:
${text.slice(0, 1500)}

OUTPUT FORMAT (JSON array):
[
  {"subject": "Entity1", "predicate": "defines", "object": "Entity2"},
  {"subject": "Entity3", "predicate": "prerequisite_of", "object": "Entity4"}
]

Extract 3-10 meaningful relationships. Use specific relationship types from the list above.
Only output the JSON array, nothing else.`;

    const result = await generateText({
      model: myProvider.languageModel('gemini-2.5-flash'),
      prompt,
      temperature: 0.3,
    });

    const content = result.text.trim();

    // Extract JSON from markdown code blocks if present
    const jsonMatch =
      content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
      content.match(/\[[\s\S]*\]/);

    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    const triplets = JSON.parse(jsonStr);

    if (!Array.isArray(triplets)) {
      console.warn('Triplet extraction did not return array');
      return [];
    }

    // Validate and filter triplets
    return triplets
      .filter(
        (t: any) =>
          t.subject &&
          t.predicate &&
          t.object &&
          typeof t.subject === 'string' &&
          typeof t.predicate === 'string' &&
          typeof t.object === 'string',
      )
      .map((t: any) => ({
        subject: t.subject.trim(),
        predicate: t.predicate.toLowerCase().replace(/\s+/g, '_'),
        object: t.object.trim(),
      }));
  } catch (error) {
    console.warn('Triplet extraction failed:', error);
    return [];
  }
}

/**
 * Extract entities from a chunk of text and store with directed triplets.
 * Updated for READ-TIME dynamic scoring architecture.
 * Pass triplets for directed relationships (e.g., prerequisite_of, implements).
 */
export async function extractAndStoreGraphData(options: {
  sourceId: string;
  chunkId?: string;
  text: string;
  triplets?: DirectedTriplet[]; // Optional directed relationships
  sourceMetadata?: Record<string, any>;
  version?: number;
  isLatestVersion?: boolean;
}): Promise<{ entityCount: number; relationCount: number }> {
  const {
    sourceId,
    chunkId,
    text,
    triplets,
    sourceMetadata,
    version,
    isLatestVersion,
  } = options;
  const entities = await extractEntities(text);

  // Supplement entities from triplets if they're missing
  // This is especially important for non-English text or when NER misses entities
  const tripletEntities: GraphEntityInput[] = [];
  if (triplets && triplets.length > 0) {
    const existingLabels = new Set(entities.map((e) => e.canonicalLabel));

    for (const triplet of triplets) {
      const subjectCanonical = triplet.subject.toLowerCase().trim();
      const objectCanonical = triplet.object.toLowerCase().trim();

      if (!existingLabels.has(subjectCanonical)) {
        tripletEntities.push({
          label: triplet.subject,
          type: 'entity',
          canonicalLabel: subjectCanonical,
        });
        existingLabels.add(subjectCanonical);
      }

      if (!existingLabels.has(objectCanonical)) {
        tripletEntities.push({
          label: triplet.object,
          type: 'entity',
          canonicalLabel: objectCanonical,
        });
        existingLabels.add(objectCanonical);
      }
    }
  }

  const mergedEntities = [...entities, ...tripletEntities];

  const { entityIds, relationCount } = await storeGraphEntitiesAndRelations({
    sourceId,
    chunkId,
    entities: mergedEntities,
    triplets, // Pass directed relationships
    sourceMetadata,
    version,
    isLatestVersion,
  });

  return { entityCount: entityIds.length, relationCount };
}
