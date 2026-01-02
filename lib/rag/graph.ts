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
  return text.replace(/\s+/g, ' ').trim() || 'placeholder';
}

function mapEntityType(raw: string): string {
  const upper = raw.toUpperCase();
  if (upper === 'PER' || upper === 'PERSON') return 'person';
  if (upper === 'ORG' || upper === 'ORGANIZATION') return 'organization';
  if (upper === 'LOC' || upper === 'LOCATION') return 'location';
  if (upper === 'MISC') return 'misc';
  return 'entity';
}

function isValidEntity(label: string): boolean {
  // Filter out garbage entities
  if (!label || label.length < 2) return false;

  // FIX 1: Reject single letter followed by word (e.g., "E Python", "F Fast")
  if (/^\b[A-Z]\s+[A-Z][a-z]+/.test(label)) return false;

  // FIX 2: Check if same word appears at start and end (e.g., "Python ... Python")
  const words = label.split(/\s+/).filter(Boolean);
  if (
    words.length > 2 &&
    words[0].toLowerCase() === words[words.length - 1].toLowerCase()
  ) {
    return false;
  }

  // FIX 3: Reject pattern like "E Python Framework D" (single letters at boundaries)
  if (/^\b[A-Z]\s+[A-Z]\w+.*[A-Z]\s*$/.test(label)) return false;

  // Reject highly repetitive patterns (e.g., "Python Python Python")
  if (/(\b\w+\b)(?:\s+\1){2,}/i.test(label)) return false;

  // Reject corrupted text patterns
  if (/TypeE\s*r|ValueError.*Index/i.test(label)) return false;

  // Reject if too many capital letters (likely corrupted)
  const capitals = (label.match(/[A-Z]/g) || []).length;
  if (capitals > label.length * 0.6 && label.length > 5) return false;

  // Reject generic names without context
  const genericNames = ['john', 'data', 'value', 'item', 'test'];
  if (genericNames.includes(label.toLowerCase()) && label.length < 6)
    return false;

  return true;
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
      if (current && isValidEntity(current.label)) {
        merged.push(current);
      }
      current = { label: word.trim(), type: mappedType };
    }
  }

  if (current && isValidEntity(current.label)) {
    merged.push(current);
  }

  const unique = Array.from(
    new Map(
      merged
        .filter((entry) => entry.label && isValidEntity(entry.label))
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

function extractTechnicalTerms(text: string): GraphEntityInput[] {
  const terms: GraphEntityInput[] = [];

  // Programming languages
  const languages =
    text.match(
      /\b(Python|JavaScript|TypeScript|Java|Ruby|Go|Rust|C\+\+|PHP|Swift|Kotlin)\b/gi,
    ) || [];
  languages.forEach((lang) => {
    terms.push({
      label: lang,
      type: 'entity',
      canonicalLabel: lang.toLowerCase(),
    });
  });

  // Frameworks (case-sensitive patterns)
  const frameworks =
    text.match(
      /\b(Django|Flask|FastAPI|React|Vue|Angular|Next\.js|Express|Nest\.js|Spring|Laravel|Rails)\b/g,
    ) || [];
  frameworks.forEach((fw) => {
    terms.push({ label: fw, type: 'entity', canonicalLabel: fw.toLowerCase() });
  });

  // Libraries
  const libraries =
    text.match(
      /\b(pandas|NumPy|TensorFlow|PyTorch|scikit-learn|Keras|matplotlib|requests|jQuery|Lodash|Axios)\b/g,
    ) || [];
  libraries.forEach((lib) => {
    terms.push({
      label: lib,
      type: 'entity',
      canonicalLabel: lib.toLowerCase(),
    });
  });

  // Tools
  const tools =
    text.match(
      /\b(pip|npm|yarn|pnpm|Git|Docker|Kubernetes|Jenkins|webpack|Vite|Babel|ESLint)\b/g,
    ) || [];
  tools.forEach((tool) => {
    terms.push({
      label: tool,
      type: 'entity',
      canonicalLabel: tool.toLowerCase(),
    });
  });

  // Databases
  const databases =
    text.match(
      /\b(PostgreSQL|MySQL|MongoDB|Redis|Cassandra|Neo4j|SQLite|Oracle|SQL Server)\b/g,
    ) || [];
  databases.forEach((db) => {
    terms.push({ label: db, type: 'entity', canonicalLabel: db.toLowerCase() });
  });

  // Remove duplicates
  const uniqueMap = new Map<string, GraphEntityInput>();
  terms.forEach((term) => {
    if (term.canonicalLabel && !uniqueMap.has(term.canonicalLabel)) {
      uniqueMap.set(term.canonicalLabel, term);
    }
  });

  return Array.from(uniqueMap.values());
}

function fallbackHeuristic(text: string): GraphEntityInput[] {
  // First, try to extract known technical terms
  const technicalTerms = extractTechnicalTerms(text);

  // Then add capitalized words as fallback
  const matches = text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
  const unique = Array.from(new Set(matches))
    .filter(isValidEntity)
    .slice(0, 10);

  const capitalizedEntities = unique.map((label) => ({
    label,
    type: 'entity',
    canonicalLabel: label.toLowerCase(),
  }));

  // Merge technical terms with capitalized words, prioritize technical terms
  const combined = [...technicalTerms, ...capitalizedEntities];
  const uniqueMap = new Map<string, GraphEntityInput>();
  combined.forEach((entity) => {
    if (entity.canonicalLabel && !uniqueMap.has(entity.canonicalLabel)) {
      uniqueMap.set(entity.canonicalLabel, entity);
    }
  });

  return Array.from(uniqueMap.values());
}

export async function extractEntities(
  text: string,
): Promise<GraphEntityInput[]> {
  const cleaned = sanitize(text);

  // Always extract technical terms first
  const technicalTerms = extractTechnicalTerms(cleaned);

  try {
    const result = await hf.tokenClassification({
      model: NER_MODEL,
      inputs: cleaned,
    });

    if (!Array.isArray(result) || result.length === 0) {
      return technicalTerms.length > 0
        ? technicalTerms
        : fallbackHeuristic(cleaned);
    }

    const nerEntities = mergeTokens(result as any[]);

    // Merge NER results with technical terms, remove duplicates
    const combined = [...technicalTerms, ...nerEntities];
    const uniqueMap = new Map<string, GraphEntityInput>();

    combined.forEach((entity) => {
      if (
        isValidEntity(entity.label) &&
        entity.canonicalLabel &&
        !uniqueMap.has(entity.canonicalLabel)
      ) {
        uniqueMap.set(entity.canonicalLabel, entity);
      }
    });

    return Array.from(uniqueMap.values());
  } catch (error) {
    console.warn('NER extraction failed, using fallback:', error);
    return technicalTerms.length > 0
      ? technicalTerms
      : fallbackHeuristic(cleaned);
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
      model: myProvider.languageModel('gemini-2.0-flash-lite'),
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
