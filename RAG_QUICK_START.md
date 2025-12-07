# RAG Quick Start Guide

## 30-Second Setup

### 1. Get API Key (2 minutes)

1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Name it "embedding-api"
4. Set "Read" access
5. Copy the token

### 2. Add to Environment

Edit `.env` and add:

```
HUGGINGFACE_API_KEY=hf_your_copied_token_here
```

### 3. Restart Server

```bash
npm run dev
```

## Testing RAG

### Upload a Document

1. Open Instructor Mode
2. Click "Add Source"
3. Upload a PDF, text, or markdown file
4. Wait for confirmation (should see "Successfully generated embeddings" in logs)

### Ask Questions

1. Type a question about the document
2. The AI will use RAG to find relevant content
3. You'll see context from your documents in the response

## Verification

### Check Embeddings Were Generated

Look for this in server logs:

```
[RAG Embed] Successfully stored X chunks for source [ID]
```

### Check Search is Working

Look for this in server logs:

```
[RAG Search] Found X relevant chunks above threshold 0.3
```

## Troubleshooting

| Issue                      | Solution                                               |
| -------------------------- | ------------------------------------------------------ |
| "Unauthorized" error       | Check HUGGINGFACE_API_KEY is set correctly             |
| No embeddings generated    | Check server logs for errors, may take 2-3s first time |
| No RAG results in response | Document may not be similar to query, lower threshold  |
| Slow embedding generation  | First chunk loads model (~2-3s), subsequent are faster |

## Performance Tips

1. **Documents**: 5-50KB documents work best (2-10 chunks)
2. **Questions**: Be specific for better matches
3. **Multiple Sources**: RAG searches across all at once
4. **Latency**: Add ~500ms for RAG search per query

## What's Happening Behind the Scenes

When you upload a document:

```
Document → Split into chunks → Generate embeddings → Store in DB
```

When you ask a question:

```
Question → Generate embedding → Find similar chunks → Inject into LLM context → Get answer
```

## Advanced Configuration

### Change Chunk Size

Edit `lib/rag/embeddings.ts`:

```typescript
const CHUNK_SIZE = 500; // Change to 200-1000
const CHUNK_OVERLAP = 100; // Change to 50-200
```

### Change Search Sensitivity

Edit call in `components/instructor-chat.tsx`:

```typescript
similarityThreshold: 0.3,  // Lower = more results (0.1-0.5)
topK: 5,                   // More results
```

## Cost Analysis

- **Free Tier**: 30,000 API calls/month
- **Typical Usage**: 200 calls/month (10 calls per document + search)
- **Cost**: $0 with free tier, no credit card needed

## Common Questions

**Q: Can I use a different embedding model?**
A: Yes, but requires code change. See `lib/rag/embeddings.ts` EMBEDDING_MODEL.

**Q: What if I upload a 100MB file?**
A: Chunking splits it intelligently. May take 10-30 seconds depending on content.

**Q: Will this work with PDFs?**
A: Text extraction requires additional library. Currently supports: .txt, .md, .json, paste text.

**Q: Can students see the RAG context?**
A: No, RAG is instructor-only feature visible only in Instructor Mode.

---

**That's it!** Your RAG system is ready to use. Start uploading documents and ask questions!

For detailed info, see `RAG_IMPLEMENTATION.md`
