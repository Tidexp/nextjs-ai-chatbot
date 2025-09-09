import { GoogleGenAI } from "@google/genai";
import { customProvider } from "ai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ----- Helper: Convert messages and extract system instruction -----
function convertToGoogleFormat(messages: any): { systemInstruction?: any, contents: any[] } {
  console.log(`[convertToGoogleFormat] Input:`, JSON.stringify(messages, null, 2));
  
  let messageArray: any[] = [];

  if (Array.isArray(messages)) {
    messageArray = messages;
  } else if (messages && typeof messages === "object") {
    if (messages.messages && Array.isArray(messages.messages)) {
      messageArray = messages.messages;
    } else {
      messageArray = [messages];
    }
  } else {
    console.error("[convertToGoogleFormat] Invalid messages format:", messages);
    throw new Error("Invalid messages format");
  }

  // Extract system message
  const systemMessage = messageArray.find(msg => msg.role === "system");
  const nonSystemMessages = messageArray.filter(msg => msg.role !== "system");

  console.log(`[convertToGoogleFormat] Found system message:`, systemMessage);
  console.log(`[convertToGoogleFormat] Non-system messages count:`, nonSystemMessages.length);

  // Convert non-system messages
  const contents = nonSystemMessages.map((msg, index) => {
    console.log(`[convertToGoogleFormat] Processing message ${index}:`, msg);

    let role = "user";
    let content = "";

    // Convert roles: assistant → model, keep user as user
    if (msg.role === "assistant") {
      role = "model";
    } else {
      role = "user"; // Default to user for any other role
    }

    // Extract content
    if (typeof msg.content === "string") {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      content = msg.content
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text || "")
        .join("");
    } else if (msg.parts && Array.isArray(msg.parts)) {
      content = msg.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text || "")
        .join("");
    } else if (msg.text) {
      content = msg.text;
    }

    return {
      role,
      parts: [{ text: content }],
    };
  });

  // Prepare system instruction
  let systemInstruction = undefined;
  if (systemMessage) {
    let systemContent = "";
    if (typeof systemMessage.content === "string") {
      systemContent = systemMessage.content;
    } else if (Array.isArray(systemMessage.content)) {
      systemContent = systemMessage.content
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text || "")
        .join("");
    }

    if (systemContent) {
      systemInstruction = {
        parts: [{ text: systemContent }]
      };
    }
  }

  console.log(`[convertToGoogleFormat] System instruction:`, JSON.stringify(systemInstruction, null, 2));
  console.log(`[convertToGoogleFormat] Contents:`, JSON.stringify(contents, null, 2));

  return { systemInstruction, contents };
}

// ----- Stream function -----
async function streamGemini(model: string, options: any) {
  console.log(`[streamGemini] Called with model: ${model}`);
  console.log(`[streamGemini] Full options:`, JSON.stringify(options, null, 2));
  console.log(`[streamGemini] Options keys:`, Object.keys(options));
  
  try {
    // Don't use convertToModelMessages - work directly with what we get
    const messages = options.prompt || options.messages || [];
    const { systemInstruction, contents } = convertToGoogleFormat(messages);
    
    const requestPayload: any = {
      model,
      contents,
      generationConfig: {
        temperature: options.temperature ?? 1,
        maxOutputTokens: options.maxTokens ?? 1024,
        topP: options.topP ?? 1,
      },
    };

    // Add system instruction if present
    if (systemInstruction) {
      requestPayload.systemInstruction = systemInstruction;
    }
    
    console.log(`[streamGemini] Calling Gemini API with:`, JSON.stringify(requestPayload, null, 2));

    const responseIterator = await ai.models.generateContentStream(requestPayload);
    console.log(`[streamGemini] responseIterator:`, responseIterator);

    console.log(`[streamGemini] Got response iterator, starting stream...`);
  
    console.log(`[streamGemini] Returning stream object to Vercel SDK...`);

    return {
      stream: new ReadableStream({
        async start(controller) {
          try {
            console.log('[streamGemini] Starting to iterate over response...');
            let chunkCount = 0;
  
            for await (const chunk of responseIterator) {
              chunkCount++;
              console.log(`[streamGemini] Chunk ${chunkCount} received:`, JSON.stringify(chunk, null, 2));
  
              const text = chunk.text;
              if (text) {
                console.log(`[streamGemini] Enqueueing text chunk ${chunkCount}:`, text);
                controller.enqueue({
                  type: "text-delta",
                  // Add 'delta' so the SDK doesn't crash when it reads chunk.delta.length
                  delta: text,
                  // Keep 'textDelta' for compatibility with other consumers
                  textDelta: text,
                });
              } else {
                console.log(`[streamGemini] Chunk ${chunkCount} had no text content`);
              }
            }
  
            console.log(`[streamGemini] Stream completed successfully. Total chunks: ${chunkCount}`);
            controller.enqueue({
              type: "finish",
              finishReason: "stop",
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            });
            controller.close();
          } catch (streamError) {
            console.error(`[streamGemini] Stream error:`, streamError);
            controller.error(streamError instanceof Error ? streamError : new Error(String(streamError)));
          }
        },
      }),
    };
  } catch (error) {
    console.error(`[streamGemini] Setup error:`, error);
    throw error;
  }
}

// ----- Non-stream function -----
async function callGemini(model: string, options: any) {
  console.log(`[callGemini] Called with model: ${model}`);
  console.log(`[callGemini] Full options:`, JSON.stringify(options, null, 2));
  
  try {
    // Align non-stream message formatting with streaming path
    const messages = options.prompt || options.messages || [];
    const { systemInstruction, contents } = convertToGoogleFormat(messages);
    
    const requestPayload: any = {
      model,
      contents,
      generationConfig: {
        temperature: options.temperature ?? 1,
        maxOutputTokens: options.maxTokens ?? 1024,
        topP: options.topP ?? 1,
      },
    };

    // Add system instruction if present
    if (systemInstruction) {
      requestPayload.systemInstruction = systemInstruction;
    }

    console.log(`[callGemini] Request payload:`, JSON.stringify(requestPayload, null, 2));

    const response = await ai.models.generateContent(requestPayload);

    console.log(`[callGemini] Response:`, response.text);

    return {
      content: [{ type: "text" as const, text: response.text || "" }],
      finishReason: "stop" as const,
      usage: { 
        promptTokens: response.usageMetadata?.promptTokenCount || 0, 
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0, 
        totalTokens: response.usageMetadata?.totalTokenCount || 0 
      },
      warnings: [],
    };
  } catch (error) {
    console.error(`[callGemini] Error:`, error);
    throw error;
  }
}

// ----- Custom provider -----
export const myProvider = customProvider({
  languageModels: {
    "gemini-2.5-pro": {
      specificationVersion: "v2",
      modelId: "gemini-2.5-pro",
      doGenerate: (opts: any) => callGemini("gemini-2.5-pro", opts),
      doStream: (opts: any) => streamGemini("gemini-2.5-pro", opts),
    } as any,
    "gemini-2.5-flash": {
      specificationVersion: "v2",
      modelId: "gemini-2.5-flash",
      doGenerate: (opts: any) => callGemini("gemini-2.5-flash", opts),
      doStream: (opts: any) => streamGemini("gemini-2.5-flash", opts),
    } as any,
    "gemini-2.5-flash-lite": {
      specificationVersion: "v2",
      modelId: "gemini-2.5-flash-lite",
      doGenerate: (opts: any) => callGemini("gemini-2.5-flash-lite", opts),
      doStream: (opts: any) => streamGemini("gemini-2.5-flash-lite", opts),
    } as any,
    "gemma-3": {
      specificationVersion: "v2",
      modelId: "models/gemma-3-12b-it",
      doGenerate: (opts: any) => callGemini("models/gemma-3-12b-it", opts),
      doStream: (opts: any) => streamGemini("models/gemma-3-12b-it", opts),
    } as any,
  },
});

export type GeminiModelId =
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemma-3';