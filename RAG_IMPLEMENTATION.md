# RAG Implementation Guide

This guide explains the Retrieval-Augmented Generation (RAG) system integrated into the Instructor Mode.

## Overview

RAG enables semantic search over uploaded documents by:

1. **Chunking** uploaded content into manageable pieces (500 tokens with 100-token overlap)
2. **Embedding** each chunk using free Hugging Face embeddings (384-dimensional vectors)
3. **Storing** chunks and embeddings in the PostgreSQL database
4. **Searching** by finding semantically similar chunks to user queries
5. **Injecting** relevant context into the LLM prompt

## Architecture

### Components

#### 1. **Core RAG Functions** (`lib/rag/embeddings.ts`)

- `generateEmbedding(text)` - Generates 384-dimensional vectors via Hugging Face free API
- `chunkText(text, 500, 100)` - Splits text into overlapping chunks
- `findRelevantChunks(query, chunks, topK, threshold)` - Semantic similarity search
- `formatContextForLLM(chunks)` - Formats results for LLM context injection

#### 2. **Database Operations** (`lib/rag/db.ts`)

- `storeDocumentChunks()` - Saves chunks with embeddings to DocumentChunk table
- `getSourceChunks()` - Retrieves chunks for a source
- `getChunksFromSources()` - Retrieves chunks from multiple sources
- `deleteSourceChunks()` - Cleans up when source is deleted

#### 3. **API Endpoints**

- **POST `/api/rag/embed`** - Generates and stores embeddings for new sources
- **POST `/api/rag/search`** - Searches chunks and returns formatted context

#### 4. **Integration Points**

- **InstructorPanel** (`components/instructor-panel.tsx`) - Triggers embedding generation after source save
- **InstructorChat** (`components/instructor-chat.tsx`) - Calls RAG search for each user query

### Data Flow

```
User uploads source
    ↓
Saves to InstructorSource table
    ↓
Calls POST /api/rag/embed with source ID and content
    ↓
Chunks text (500 tokens, 100 overlap)
    ↓
Generates embedding for each chunk via Hugging Face
    ↓
Stores chunks in DocumentChunk table with embeddings
    ↓
On user question: POST /api/rag/search
    ↓
Generates embedding for user query
    ↓
Finds top 5 similar chunks (cosine similarity > 0.3)
    ↓
Formats and injects into system message
    ↓
LLM responds with source context
```

## Setup

### 1. Get Hugging Face API Key

1. Go to https://huggingface.co/settings/tokens
2. Create a new token with read access
3. Add to `.env`:
   ```
   HUGGINGFACE_API_KEY=hf_your_token_here
   ```

### 2. Database Setup

The `DocumentChunk` table is already defined in `lib/db/schema.ts`:

```typescript
export const documentChunk = pgTable("DocumentChunk", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("sourceId").references(() => instructorSource.id, {
    onDelete: "cascade",
  }),
  chunkIndex: integer("chunkIndex").notNull(),
  content: text("content").notNull(),
  embedding: text("embedding").notNull(), // JSON string of 384-dim vector
  tokenCount: integer("tokenCount").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
```

**Note:** Embeddings are stored as JSON strings, not using pgvector extension. This avoids needing extra database setup while still enabling similarity search via application code.

### 3. Verify Installation

Required packages should already be installed:

```bash
npm list @huggingface/inference pgvector
```

## Configuration

### Chunking Parameters

- **Chunk Size**: 500 tokens (~2000 characters)
- **Overlap**: 100 tokens (prevents context loss between chunks)
- **Adjustment**: Edit `lib/rag/embeddings.ts` CHUNK_SIZE and CHUNK_OVERLAP constants

### Search Parameters

- **Top K**: 5 (number of chunks returned)
- **Similarity Threshold**: 0.3 (minimum cosine similarity)
- **Adjustment**: Pass different values to POST `/api/rag/search`

### Embedding Model

- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Dimensions**: 384
- **Provider**: Hugging Face (free)
- **Speed**: ~100-200ms per chunk
- **Change Model**: Edit EMBEDDING_MODEL in `lib/rag/embeddings.ts`

## Usage

### From Instructor Panel

When user uploads a source:

```typescript
const savedSource = await saveSourceToAPI({
  title: "My Document",
  type: "markdown",
  excerpt: "...",
  content: fileContent, // Pass content here
});
// Automatically generates embeddings
```

### From Instructor Chat

When user asks a question:

```typescript
const ragResponse = await fetch("/api/rag/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: userQuestion,
    sourceIds: sources.map((s) => s.id),
    topK: 5,
    similarityThreshold: 0.3,
  }),
});

const { formattedContext, results } = await ragResponse.json();
// formattedContext is injected into system message
```

## Performance Notes

### Embedding Generation

- **First embedding**: ~2-3 seconds (model warmup)
- **Subsequent**: ~100-200ms per chunk
- **For 10KB file**: ~2-5 chunks, ~500ms-1s total

### Search

- **Query embedding**: ~200ms
- **Similarity search**: ~10-50ms (depends on total chunks)
- **Total**: ~250-300ms per search query

### Optimization Tips

1. **Rate limiting**: 3 chunks processed before 500ms delay to avoid API rate limits
2. **Chunk caching**: Embeddings cached in database forever (until source deleted)
3. **Batch operations**: Multiple chunks processed in single API call where possible

## Troubleshooting

### "Failed to generate embeddings"

- Check HUGGINGFACE_API_KEY is set and valid
- Verify network connectivity
- Check Hugging Face API status

### "No matching content found in sources"

- Similarity threshold may be too high (default 0.3)
- Query may not match source content semantically
- Lower threshold in search call: `similarityThreshold: 0.1`

### Slow embedding generation

- First embedding loads model (slower)
- Subsequent embeddings are cached
- Check network latency to Hugging Face API

### Missing DocumentChunk table

- Schema is defined but migrations may need running
- Run: `npm run db:migrate`
- Or manually create table using schema definition

## Future Improvements

1. **Batch API Calls**: Process multiple chunks in single API call
2. **Caching**: Cache frequently searched embeddings in memory
3. **Model Swapping**: Support different embedding models (GPT, Cohere)
4. **Hybrid Search**: Combine semantic + keyword-based search
5. **Multi-language**: Use multilingual embedding model for international content
6. **Streaming**: Stream RAG context generation as chunks are processed

## Cost Analysis

**Free Tier (Hugging Face Inference API)**:

- Up to 30,000 API calls/month free
- No credit card required
- Fair usage policy enforced

**Example Usage**:

- 10 documents × 10 chunks each = 100 chunks (100 embeddings)
- 100 searches/month = 100 query embeddings
- Total: ~200 API calls/month (well under free tier)

**Paid Tier**:

- Required for high-volume applications
- ~$0.0001 per embedding (millions of calls)
- See https://huggingface.co/pricing/inference

---

For questions or issues, check the main README.md or contact the maintainers.
