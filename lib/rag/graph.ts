import { HfInference } from '@huggingface/inference';

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

  const { entityIds, relationCount } = await storeGraphEntitiesAndRelations({
    sourceId,
    chunkId,
    entities,
    triplets, // Pass directed relationships
    sourceMetadata,
    version,
    isLatestVersion,
  });

  return { entityCount: entityIds.length, relationCount };
}
