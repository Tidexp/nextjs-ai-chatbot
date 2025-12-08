import { GoogleGenAI } from '@google/genai';
import { customProvider } from 'ai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// CodeLlama API configuration
const CODELLAMA_API_URL =
  process.env.CODELLAMA_API_URL || 'http://localhost:8000';

// In: @/lib/ai/providers.ts (or wherever your provider is)

// ----- Helper: Convert messages and extract system instruction (DEFINITIVELY FIXED) -----
async function convertToGoogleFormat(
  messages: any,
  limit: number = 10,
): Promise<{ systemInstruction?: any; contents: any[] }> {
  let messageArray: any[] = [];

  // This logic handles input from the Vercel AI SDK which is now an object, not just an array.
  if (messages?.messages && Array.isArray(messages.messages)) {
    messageArray = messages.messages;
  } else if (Array.isArray(messages)) {
    messageArray = messages;
  } else {
    console.error('[convertToGoogleFormat] Invalid messages format:', messages);
    throw new Error('Invalid messages format');
  }

  console.log(
    '[convertToGoogleFormat] Processing messages:',
    JSON.stringify(messageArray, null, 2),
  );

  // Validate that all messages have the required structure
  for (let i = 0; i < messageArray.length; i++) {
    const msg = messageArray[i];
    if (!msg || typeof msg !== 'object') {
      console.error(
        `[convertToGoogleFormat] Invalid message at index ${i}:`,
        msg,
      );
      throw new Error(`Invalid message at index ${i}`);
    }
    if (!msg.role) {
      console.error(
        `[convertToGoogleFormat] Message at index ${i} missing role:`,
        msg,
      );
      throw new Error(`Message at index ${i} missing role`);
    }
    if (!msg.content) {
      console.error(
        `[convertToGoogleFormat] Message at index ${i} missing content:`,
        msg,
      );
      throw new Error(`Message at index ${i} missing content`);
    }
  }

  const systemMessage = messageArray.find((msg) => msg.role === 'system');
  let nonSystemMessages = messageArray.filter((msg) => msg.role !== 'system');

  if (limit > 0 && nonSystemMessages.length > limit) {
    nonSystemMessages = nonSystemMessages.slice(-limit);
  }

  const contents = await Promise.all(
    nonSystemMessages.map(async (msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';

      // The Vercel AI SDK now puts the parts array in `msg.content`
      const sourceParts = Array.isArray(msg.content) ? msg.content : [];
      console.log(
        `[convertToGoogleFormat] Processing message ${msg.role} with parts:`,
        JSON.stringify(sourceParts, null, 2),
      );

      let parts: any[] = [];
      if (sourceParts.length > 0) {
        parts = await Promise.all(
          sourceParts.map(async (part: any): Promise<any> => {
            // --- CRITICAL FIX START ---
            // If the part is for text, it must be in the format { text: "..." }
            if (part.type === 'text') {
              return { text: part.text };
            }
            // --- CRITICAL FIX END ---

            // Handle images
            if (
              part.type === 'image' ||
              (part.type === 'file' && part.mediaType?.startsWith('image/'))
            ) {
              const imageData = part.image || part.url;

              // Skip if no image data
              if (!imageData) {
                console.warn(
                  '[convertToGoogleFormat] No image data found in part:',
                  part,
                );
                return null;
              }

              // Validate image data
              if (typeof imageData !== 'string') {
                console.warn(
                  '[convertToGoogleFormat] Invalid image data type:',
                  typeof imageData,
                  imageData,
                );
                return null;
              }

              try {
                if (typeof imageData === 'string') {
                  if (imageData.startsWith('http')) {
                    // Fetch từ URL public
                    console.log(
                      '[convertToGoogleFormat] Fetching image from URL:',
                      imageData,
                    );
                    const response = await fetch(imageData);
                    if (!response.ok) {
                      console.error(
                        `[convertToGoogleFormat] Failed to fetch image: ${response.statusText}`,
                      );
                      return null;
                    }
                    const mimeType =
                      response.headers.get('content-type') ||
                      part.mediaType ||
                      'image/png';
                    const buffer = await response.arrayBuffer();
                    const data = Buffer.from(buffer).toString('base64');
                    console.log(
                      '[convertToGoogleFormat] Successfully processed image from URL',
                    );
                    return { inlineData: { mimeType, data } };
                  }

                  // Nếu là data URI
                  const match = imageData.match(
                    /^data:(image\/\w+);base64,(.*)$/,
                  );
                  if (match) {
                    console.log(
                      '[convertToGoogleFormat] Processing data URI image',
                    );
                    return {
                      inlineData: { mimeType: match[1], data: match[2] },
                    };
                  }
                }

                if (
                  imageData &&
                  typeof imageData === 'object' &&
                  (imageData as any) instanceof Buffer
                ) {
                  console.log(
                    '[convertToGoogleFormat] Processing Buffer image',
                  );
                  return {
                    inlineData: {
                      mimeType: part.mediaType || 'image/png',
                      data: (imageData as Buffer).toString('base64'),
                    },
                  };
                }

                console.warn(
                  '[convertToGoogleFormat] Unsupported image format:',
                  typeof imageData,
                  imageData,
                );
                return null;
              } catch (err) {
                console.error(
                  '[convertToGoogleFormat] Error handling image:',
                  err,
                );
                return null;
              }
            }

            // Handle PDF and text files
            if (
              part.type === 'file' &&
              (part.mediaType === 'application/pdf' ||
                part.mediaType === 'text/plain')
            ) {
              const fileData = part.file || part.url;

              // Skip if no file data
              if (!fileData) {
                console.warn(
                  '[convertToGoogleFormat] No file data found in part:',
                  part,
                );
                return null;
              }

              // Validate file data
              if (typeof fileData !== 'string') {
                console.warn(
                  '[convertToGoogleFormat] Invalid file data type:',
                  typeof fileData,
                  fileData,
                );
                return null;
              }

              try {
                if (fileData.startsWith('http')) {
                  // Fetch from URL
                  console.log(
                    '[convertToGoogleFormat] Fetching file from URL:',
                    fileData,
                  );
                  const response = await fetch(fileData);
                  if (!response.ok) {
                    console.error(
                      `[convertToGoogleFormat] Failed to fetch file: ${response.statusText}`,
                    );
                    return null;
                  }
                  const mimeType =
                    response.headers.get('content-type') ||
                    part.mediaType ||
                    'application/pdf';

                  if (part.mediaType === 'text/plain') {
                    // For text files, send as text content instead of inlineData
                    const textContent = await response.text();
                    console.log(
                      '[convertToGoogleFormat] Successfully processed text file from URL, content:',
                      JSON.stringify(textContent),
                    );
                    console.log(
                      '[convertToGoogleFormat] File name:',
                      part.name,
                    );
                    return {
                      text: `\n--- FILE CONTENT START (${part.name || 'uploaded file'}) ---\n${textContent}\n--- FILE CONTENT END ---\n`,
                    };
                  } else {
                    // For PDF files, use inlineData
                    const buffer = await response.arrayBuffer();
                    const data = Buffer.from(buffer).toString('base64');
                    console.log(
                      '[convertToGoogleFormat] Successfully processed PDF file from URL',
                    );
                    return { inlineData: { mimeType, data } };
                  }
                }

                // Handle data URI
                const match = fileData.match(/^data:([^;]+);base64,(.*)$/);
                if (match) {
                  console.log(
                    '[convertToGoogleFormat] Processing data URI file',
                  );
                  if (part.mediaType === 'text/plain') {
                    // For text files, decode and send as text
                    const textContent = Buffer.from(
                      match[2],
                      'base64',
                    ).toString('utf-8');
                    console.log(
                      '[convertToGoogleFormat] Successfully processed text file from data URI, content:',
                      textContent,
                    );
                    return {
                      text: `\n--- FILE CONTENT START (${part.name || 'uploaded file'}) ---\n${textContent}\n--- FILE CONTENT END ---\n`,
                    };
                  } else {
                    // For PDF files, use inlineData
                    return {
                      inlineData: { mimeType: match[1], data: match[2] },
                    };
                  }
                }

                console.warn(
                  '[convertToGoogleFormat] Unsupported file format:',
                  typeof fileData,
                  fileData,
                );
                return null;
              } catch (err) {
                console.error(
                  '[convertToGoogleFormat] Error handling file:',
                  err,
                );
                return null;
              }
            }

            // Ignore any other part types
            return null;
          }),
        );
        parts = parts.filter((p) => p != null);
      }

      console.log(
        `[convertToGoogleFormat] Final message for ${role}:`,
        JSON.stringify({ role, parts }, null, 2),
      );
      return { role, parts };
    }),
  );

  // System instruction processing (should be correct already)
  let systemInstruction = undefined;
  if (systemMessage) {
    let systemContent = '';
    if (Array.isArray(systemMessage.content)) {
      systemContent = systemMessage.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text || '')
        .join('\n');
    } else if (typeof systemMessage.content === 'string') {
      systemContent = systemMessage.content;
    }

    if (systemContent) {
      systemInstruction = {
        parts: [{ text: systemContent }],
      };
    }
  }

  return { systemInstruction, contents };
}

// ----- Stream function (UPDATED) -----
async function streamGemini(model: string, options: any) {
  console.log(`[streamGemini] Called with model: ${model}`);

  try {
    const messages = options.prompt || options.messages || [];
    // MUST use await here
    const { systemInstruction, contents } = await convertToGoogleFormat(
      messages,
      10,
    );

    // Since gemini-2.5 models are multimodal, no need to switch models.
    // The `model` parameter is used directly.
    const requestPayload: any = {
      model, // Use the model passed in directly
      contents,
      generationConfig: {
        temperature: options.temperature ?? 1,
        maxOutputTokens: options.maxTokens ?? 8192,
        topP: options.topP ?? 1,
        // Enable streaming optimizations
        candidateCount: 1,
        stopSequences: [],
      },
    };

    if (systemInstruction) {
      requestPayload.systemInstruction = systemInstruction;
    }

    console.log(
      `[streamGemini] Calling Gemini API with:`,
      JSON.stringify(requestPayload, null, 2),
    );
    console.log(
      `[streamGemini] Request payload contents:`,
      JSON.stringify(requestPayload.contents, null, 2),
    );

    let responseIterator: any;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      try {
        responseIterator =
          await ai.models.generateContentStream(requestPayload);
        console.log(`[streamGemini] Successfully got response iterator`);
        break;
      } catch (apiError: any) {
        console.error(
          `[streamGemini] Google API error (attempt ${retryCount + 1}):`,
          apiError,
        );

        // Check if it's a 503 error (overloaded) and we can retry
        if (apiError?.status === 503 && retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(
            `[streamGemini] Model ${model} overloaded, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries + 1})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }

        console.error(`[streamGemini] Error details:`, {
          message: apiError?.message,
          stack: apiError?.stack,
          name: apiError?.name,
        });
        throw apiError;
      }
    }

    return {
      stream: new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseIterator) {
              const text = chunk.text;
              if (text) {
                console.log(
                  `[streamGemini] Streaming chunk:`,
                  text.slice(0, 50) + (text.length > 50 ? '...' : ''),
                );

                // Emit SSE-compatible text-delta event
                controller.enqueue({
                  type: 'text-delta',
                  delta: text,
                  textDelta: text,
                });

                // Add small delay to ensure proper streaming
                await new Promise((resolve) => setTimeout(resolve, 10));
              }
            }

            // Emit finish event
            controller.enqueue({
              type: 'finish',
              finishReason: 'stop',
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            });

            controller.close();
          } catch (streamError) {
            console.error(`[streamGemini] Stream error:`, streamError);

            // Emit error event in SSE format
            controller.enqueue({
              type: 'error',
              error:
                streamError instanceof Error
                  ? streamError.message
                  : String(streamError),
            });

            controller.error(
              streamError instanceof Error
                ? streamError
                : new Error(String(streamError)),
            );
          }
        },
      }),
    };
  } catch (error) {
    console.error(`[streamGemini] Setup error:`, error);
    throw error;
  }
}

// ----- Non-stream function (UPDATED) -----
// ----- Non-stream function (DEFINITIVELY FIXED) -----
async function callGemini(model: string, options: any) {
  console.log(`[callGemini] Called with model: ${model}`);

  try {
    const messages = options.prompt || options.messages || [];
    const { systemInstruction, contents } =
      await convertToGoogleFormat(messages);

    const requestPayload: any = {
      model,
      contents,
      generationConfig: {
        temperature: options.temperature ?? 1,
        maxOutputTokens: options.maxTokens ?? 8192,
        topP: options.topP ?? 1,
      },
    };

    if (systemInstruction) {
      requestPayload.systemInstruction = systemInstruction;
    }

    console.log(
      `[callGemini] Request payload:`,
      JSON.stringify(requestPayload, null, 2),
    );

    // The object returned here IS the final response object.
    const response = await ai.models.generateContent(requestPayload);

    // ******** FIX IS HERE ********
    // Access 'candidates' and 'usageMetadata' directly from the response object.
    // There is no extra '.response' nesting.
    const responseText =
      response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usageMetadata = response.usageMetadata;
    // ***************************

    console.log(`[callGemini] Response:`, responseText);

    return {
      content: [{ type: 'text' as const, text: responseText }],
      finishReason: 'stop' as const,
      usage: {
        promptTokens: usageMetadata?.promptTokenCount || 0,
        completionTokens: usageMetadata?.candidatesTokenCount || 0,
        totalTokens: usageMetadata?.totalTokenCount || 0,
      },
      warnings: [],
    };
  } catch (error) {
    console.error(`[callGemini] Error:`, error);
    throw error;
  }
}

// ----- CodeLlama functions -----
async function streamCodeLlama(model: string, options: any) {
  console.log(`[streamCodeLlama] Called with model: ${model}`);

  try {
    const messages = options.prompt || options.messages || [];
    let prompt = '';

    // Extract prompt from messages
    if (Array.isArray(messages)) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && Array.isArray(lastMessage.content)) {
        prompt = lastMessage.content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('\n');
      } else if (typeof lastMessage?.content === 'string') {
        prompt = lastMessage.content;
      }
    }

    console.log(
      `[streamCodeLlama] Calling CodeLlama API with prompt:`,
      prompt.slice(0, 100),
    );

    const response = await fetch(`${CODELLAMA_API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        max_tokens: options.maxTokens || 512,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.95,
        top_k: 50,
      }),
    });

    if (!response.ok) {
      throw new Error(`CodeLlama API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      stream: new ReadableStream({
        async start(controller) {
          try {
            if (data.success && data.response) {
              let text = data.response;

              // Auto-format code if it looks like code (contains common code patterns)
              const codePatterns =
                /^(def |function |class |import |const |let |var |public |private |package |\#include |<\?php)/m;
              const hasCodePattern = codePatterns.test(text);

              // Check if already has markdown code blocks
              const hasMarkdown = /```/.test(text);

              if (hasCodePattern && !hasMarkdown) {
                // Try to detect language from prompt
                let language = 'python'; // default
                const promptLower = prompt.toLowerCase();
                if (
                  promptLower.includes('javascript') ||
                  promptLower.includes('js')
                )
                  language = 'javascript';
                else if (
                  promptLower.includes('typescript') ||
                  promptLower.includes('ts')
                )
                  language = 'typescript';
                else if (promptLower.includes('java')) language = 'java';
                else if (
                  promptLower.includes('c++') ||
                  promptLower.includes('cpp')
                )
                  language = 'cpp';
                else if (
                  promptLower.includes('c#') ||
                  promptLower.includes('csharp')
                )
                  language = 'csharp';
                else if (promptLower.includes('html')) language = 'html';
                else if (promptLower.includes('css')) language = 'css';
                else if (promptLower.includes('sql')) language = 'sql';
                else if (promptLower.includes('rust')) language = 'rust';
                else if (promptLower.includes('go')) language = 'go';
                else if (promptLower.includes('php')) language = 'php';

                // Wrap code in markdown code block
                text = `\`\`\`${language}\n${text}\n\`\`\``;
              }

              const chunkSize = 10;

              for (let i = 0; i < text.length; i += chunkSize) {
                const chunk = text.slice(i, i + chunkSize);

                controller.enqueue({
                  type: 'text-delta',
                  delta: chunk,
                  textDelta: chunk,
                });

                // Small delay for streaming effect
                await new Promise((resolve) => setTimeout(resolve, 20));
              }

              controller.enqueue({
                type: 'finish',
                finishReason: 'stop',
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
              });
            } else {
              throw new Error(data.error || 'Unknown error from CodeLlama API');
            }

            controller.close();
          } catch (error) {
            console.error(`[streamCodeLlama] Stream error:`, error);
            controller.enqueue({
              type: 'error',
              error: error instanceof Error ? error.message : String(error),
            });
            controller.error(
              error instanceof Error ? error : new Error(String(error)),
            );
          }
        },
      }),
    };
  } catch (error) {
    console.error(`[streamCodeLlama] Setup error:`, error);
    throw error;
  }
}

async function callCodeLlama(model: string, options: any) {
  console.log(`[callCodeLlama] Called with model: ${model}`);

  try {
    const messages = options.prompt || options.messages || [];
    let prompt = '';

    // Extract prompt from messages
    if (Array.isArray(messages)) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && Array.isArray(lastMessage.content)) {
        prompt = lastMessage.content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('\n');
      } else if (typeof lastMessage?.content === 'string') {
        prompt = lastMessage.content;
      }
    }

    console.log(
      `[callCodeLlama] Calling CodeLlama API with prompt:`,
      prompt.slice(0, 100),
    );

    const response = await fetch(`${CODELLAMA_API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        max_tokens: options.maxTokens || 512,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.95,
        top_k: 50,
      }),
    });

    if (!response.ok) {
      throw new Error(`CodeLlama API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Unknown error from CodeLlama API');
    }

    let text = data.response;

    // Auto-format code if it looks like code (contains common code patterns)
    const codePatterns =
      /^(def |function |class |import |const |let |var |public |private |package |\#include |<\?php)/m;
    const hasCodePattern = codePatterns.test(text);

    // Check if already has markdown code blocks
    const hasMarkdown = /```/.test(text);

    if (hasCodePattern && !hasMarkdown) {
      // Try to detect language from prompt
      let language = 'python'; // default
      const promptLower = prompt.toLowerCase();
      if (promptLower.includes('javascript') || promptLower.includes('js'))
        language = 'javascript';
      else if (promptLower.includes('typescript') || promptLower.includes('ts'))
        language = 'typescript';
      else if (promptLower.includes('java')) language = 'java';
      else if (promptLower.includes('c++') || promptLower.includes('cpp'))
        language = 'cpp';
      else if (promptLower.includes('c#') || promptLower.includes('csharp'))
        language = 'csharp';
      else if (promptLower.includes('html')) language = 'html';
      else if (promptLower.includes('css')) language = 'css';
      else if (promptLower.includes('sql')) language = 'sql';
      else if (promptLower.includes('rust')) language = 'rust';
      else if (promptLower.includes('go')) language = 'go';
      else if (promptLower.includes('php')) language = 'php';

      // Wrap code in markdown code block
      text = `\`\`\`${language}\n${text}\n\`\`\``;
    }

    return {
      content: [{ type: 'text' as const, text }],
      finishReason: 'stop' as const,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      warnings: [],
    };
  } catch (error) {
    console.error(`[callCodeLlama] Error:`, error);
    throw error;
  }
}

// ----- Custom provider (ORIGINAL MODELS RESTORED) -----
export const myProvider = customProvider({
  languageModels: {
    'gemini-2.5-pro': {
      specificationVersion: 'v2',
      modelId: 'gemini-2.5-pro',
      doGenerate: (opts: any) => callGemini('gemini-2.5-pro', opts),
      doStream: (opts: any) => streamGemini('gemini-2.5-pro', opts),
    } as any,
    'gemini-2.5-flash': {
      specificationVersion: 'v2',
      modelId: 'gemini-2.5-flash',
      doGenerate: (opts: any) => callGemini('gemini-2.5-flash', opts),
      doStream: (opts: any) => streamGemini('gemini-2.5-flash', opts),
    } as any,
    'gemini-2.5-flash-lite': {
      specificationVersion: 'v2',
      modelId: 'gemini-2.5-flash-lite',
      doGenerate: (opts: any) => callGemini('gemini-2.5-flash-lite', opts),
      doStream: (opts: any) => streamGemini('gemini-2.5-flash-lite', opts),
    } as any,
    'gemma-3': {
      specificationVersion: 'v2',
      modelId: 'models/gemma-3-12b-it',
      doGenerate: (opts: any) => callGemini('models/gemma-3-12b-it', opts),
      doStream: (opts: any) => streamGemini('models/gemma-3-12b-it', opts),
    } as any,
    'codellama-7b-instruct': {
      specificationVersion: 'v2',
      modelId: 'codellama-7b-instruct',
      doGenerate: (opts: any) => callCodeLlama('codellama-7b-instruct', opts),
      doStream: (opts: any) => streamCodeLlama('codellama-7b-instruct', opts),
    } as any,
  },
});

export type GeminiModelId =
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemma-3'
  | 'codellama-7b-instruct';
