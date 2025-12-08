Error generating embedding: Error [ProviderApiError]: Failed to perform inference: invalid high surrogate in string: line 1 column 12 (char 11)
at async generateEmbedding (file://C%3A/projects/nextjs-ai-chatbot-main/lib/rag/embeddings.ts:50:19)  
 at async (file://C%3A/projects/nextjs-ai-chatbot-main/app/api/rag/embed/route.ts:109:28)
at async POST (file://C%3A/projects/nextjs-ai-chatbot-main/app/api/rag/embed/route.ts:129:27)
48 |
49 | // Fallback to SDK if direct API disabled

> 50 | const result = await hf.featureExtraction({

     |                   ^

51 | model: EMBEDDING_MODEL,
52 | inputs: text,
53 | waitForModel: true, {
httpRequest: [Object],
httpResponse: [Object]
}
[RAG Embed] Failed to embed chunk 307: Error: Failed to generate embedding: Failed to perform inference: invalid high surrogate in string: line 1 column 12 (char 11)
at generateEmbedding (file://C%3A/projects/nextjs-ai-chatbot-main/lib/rag/embeddings.ts:58:10)  
 at async (file://C%3A/projects/nextjs-ai-chatbot-main/app/api/rag/embed/route.ts:109:28)
at async POST (file://C%3A/projects/nextjs-ai-chatbot-main/app/api/rag/embed/route.ts:129:27)
56 | } catch (error: any) {
57 | console.error('Error generating embedding:', error);

> 58 | throw new Error(`Failed to generate embedding: ${error.message}`);

     |          ^

59 | }
60 | }
61 |
[RAG Embed] Error: Error: Failed to embed chunk 307: Error: Failed to generate embedding: Failed to perform inference: invalid high surrogate in string: line 1 column 12 (char 11)
at <unknown> (file://C%3A/projects/nextjs-ai-chatbot-main/app/api/rag/embed/route.ts:125:16)
at async POST (file://C%3A/projects/nextjs-ai-chatbot-main/app/api/rag/embed/route.ts:129:27)
123 | error,
124 | );

> 125 | throw new Error(`Failed to embed chunk ${globalIndex}: ${error}`);

      |                ^

126 | }
127 | });
128 |
POST /api/rag/embed 500 in 13810ms
Error generating embedding: Error [ProviderApiError]: Failed to perform inference: 500 Internal Server Error
at async generateEmbedding (file://C%3A/projects/nextjs-ai-chatbot-main/lib/rag/embeddings.ts:50:19)  
 at async (file://C%3A/projects/nextjs-ai-chatbot-main/app/api/rag/embed/route.ts:109:28)
48 |
49 | // Fallback to SDK if direct API disabled

> 50 | const result = await hf.featureExtraction({

     |                   ^

51 | model: EMBEDDING_MODEL,
52 | inputs: text,
53 | waitForModel: true, {
httpRequest: [Object],
httpResponse: [Object]
}
[RAG Embed] Failed to embed chunk 321: Error: Failed to generate embedding: Failed to perform inference: 500 Internal Server Error
at generateEmbedding (file://C%3A/projects/nextjs-ai-chatbot-main/lib/rag/embeddings.ts:58:10)  
 at async (file://C%3A/projects/nextjs-ai-chatbot-main/app/api/rag/embed/route.ts:109:28)
56 | } catch (error: any) {
57 | console.error('Error generating embedding:', error);

> 58 | throw new Error(`Failed to generate embedding: ${error.message}`);

     |          ^

59 | }
60 | }
61 |
