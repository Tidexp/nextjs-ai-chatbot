# Weighted Graph RAG Implementation

## Overview

Your Graph RAG system now uses **weighted edges** that accumulate strength over repeated co-occurrences and contribute proportionally to retrieval ranking.

## Changes Made

### 1. Edge Weight Accumulation ([lib/rag/db.ts](lib/rag/db.ts))

- **Before:** `onConflictDoNothing()` – duplicate edges were ignored
- **After:** `onConflictDoUpdate()` with `weight = weight + 1` – edge weight increments each time entities co-occur in a new chunk

```typescript
.onConflictDoUpdate({
  target: [
    graphRelation.sourceId,
    graphRelation.fromEntityId,
    graphRelation.toEntityId,
    graphRelation.relationType,
  ],
  set: {
    weight: sql`${graphRelation.weight} + 1`,
  },
})
```

**Effect:** Frequently co-occurring entities build stronger connections (weight = 2, 3, 4...).

### 2. Weight-Aware Chunk Retrieval ([lib/rag/db.ts](lib/rag/db.ts))

`getChunksByEntities()` now:

- Fetches relation weights from the database
- Calculates `maxWeight` for each chunk (max edge weight among its entities)
- Returns `maxWeight` alongside matched/related entities

### 3. Weighted Hybrid Scoring ([app/api/rag/search/route.ts](app/api/rag/search/route.ts))

- **Before:** Binary `graphScore` (0 or 1)
- **After:** Logarithmic scaling `graphScore = log(1 + maxWeight)`

```typescript
const weightedScore = Math.log(1 + graphChunk.maxWeight);
hybridScore = vectorScore + graphScore * 0.3;
```

**Why log scaling?**

- Weight = 1 → score ≈ 0.69
- Weight = 5 → score ≈ 1.79
- Weight = 10 → score ≈ 2.40

Prevents a single high-weight edge from dominating; diminishing returns encourage diversity.

## How It Works

### Edge Weight Growth

1. **First co-occurrence:** Entities A and B appear in chunk 1 → edge created with `weight = 1`
2. **Second co-occurrence:** A and B appear in chunk 5 → `weight = 2`
3. **Third co-occurrence:** A and B appear in chunk 12 → `weight = 3`

### Retrieval Example

**Query:** "machine learning algorithms"

1. **NER extracts:** ["machine learning", "algorithms"]
2. **Graph finds:**
   - Direct match: chunk with "machine learning" entity (weight = 5)
   - Related match: chunk with "neural networks" entity (connected via weight = 3 edge)
3. **Scoring:**
   - Vector similarity: 0.75
   - Graph score: log(1 + 5) ≈ 1.79
   - Hybrid: 0.75 + (1.79 × 0.3) = **1.29**

Higher weights → better ranking.

## Tuning Parameters

### Graph Boost Multiplier

Currently `0.3` in `hybridScore = vectorScore + graphScore * 0.3`

- **Increase** (e.g., `0.5`) → stronger graph influence, prioritize entity matches
- **Decrease** (e.g., `0.2`) → weaker graph influence, trust vector similarity more

### Logarithmic Base

Currently `log(1 + weight)` (natural log)

- **Alternative:** `log2(1 + weight)` for gentler scaling
- **Alternative:** `sqrt(weight)` for linear-ish growth
- **Alternative:** `min(weight, 5)` for hard cap at 5

### Weight Initialization

Currently starts at `1`. Consider:

- Type-aware initialization: `co_occurs: 1`, `references: 2`, `defines: 3`
- Chunk quality multiplier: high-quality sources contribute more weight per occurrence

## Advanced Extensions

### 1. Time Decay

Reduce weight over time so recent co-occurrences matter more:

```typescript
weight: sql`${graphRelation.weight} + 1 * exp(-0.001 * extract(epoch from (now() - created_at)))`;
```

### 2. Type-Aware Weights

Different relation types carry different semantic strength:

```typescript
const baseWeight =
  relationType === "defines" ? 2 : relationType === "references" ? 1.5 : 1;
```

### 3. Centrality Boosting

Prioritize hub entities (high degree) but penalize generic stopwords:

- Compute PageRank or degree centrality
- Apply to `graphScore`: `log(1 + weight) * log(1 + centrality)`

### 4. Multi-Hop Traversal

Expand 2-3 hops from query entities with decaying weight:

- 1-hop: full weight
- 2-hop: weight × 0.5
- 3-hop: weight × 0.25

## Testing the System

### Verify Weight Accumulation

```sql
-- Check edge weights after processing multiple documents
SELECT
  from_entity.label as from_label,
  to_entity.label as to_label,
  gr.weight,
  gr.relation_type
FROM "GraphRelation" gr
JOIN "GraphEntity" from_entity ON gr.from_entity_id = from_entity.id
JOIN "GraphEntity" to_entity ON gr.to_entity_id = to_entity.id
ORDER BY gr.weight DESC
LIMIT 20;
```

### Test Retrieval

Upload multiple documents mentioning the same concepts, then query and observe:

- Chunks with frequently co-occurring entities rank higher
- Graph scores in logs show weighted values (not just 0/1)

## Migration Notes

- Existing edges in the database retain `weight = 1`
- New co-occurrences will increment properly
- No schema migration needed (weight column already exists)

## Benefits

✅ Stronger entity relationships accumulate over corpus  
✅ Frequent patterns surface more reliably  
✅ Diminishing returns prevent over-weighting  
✅ Transparent: weights visible in database for inspection  
✅ Reversible: can always revert to binary scoring if needed

## Further Reading

- [GraphRAG Paper (Microsoft)](https://arxiv.org/abs/2404.16130)
- [Knowledge Graph Embeddings Survey](https://arxiv.org/abs/2002.00819)
- [Hybrid Search Best Practices](https://www.pinecone.io/learn/hybrid-search-intro/)
