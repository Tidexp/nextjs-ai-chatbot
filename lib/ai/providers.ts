import { GoogleGenAI } from "@google/genai";
import {
  customProvider,
  convertToModelMessages
} from "ai";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});

// Define the tool types to match the StreamTextResult generic
type ToolCall = {
  tool: string;
  value: any;
};

async function callGemini(model: string, options: any) {
  // Convert AI SDK messages to simple string content
  const messages = convertToModelMessages(options.messages);
  const lastMessage = messages[messages.length - 1];
  
  let content = '';
  if (typeof lastMessage.content === 'string') {
    content = lastMessage.content;
  } else if (Array.isArray(lastMessage.content)) {
    content = lastMessage.content
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text || '')
      .join('');
  }

  const response = await ai.models.generateContent({
    model,
    contents: content,
  });

  return {
    content: [{ type: "text" as const, text: response.text || "" }],
    finishReason: "stop" as const,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    warnings: [],
  } as any;
}

async function streamGemini(model: string, options: any): Promise<AsyncIterable<{ text?: string; tool?: ToolCall }>> {
  const messages = convertToModelMessages(options.messages);
  const lastMessage = messages[messages.length - 1];

  let content = '';
  if (typeof lastMessage.content === 'string') {
    content = lastMessage.content;
  } else if (Array.isArray(lastMessage.content)) {
    content = lastMessage.content
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text || '')
      .join('');
  }

  console.log(`[streamGemini] Calling generateContentStream with model: ${model}, content: ${content}`);
  const responseIterator = await ai.models.generateContentStream({
    model,
    contents: content,
  });

  async function* generator() {
    try {
      for await (const chunk of responseIterator) {
        console.log(`[streamGemini] Received chunk:`, JSON.stringify(chunk, null, 2));
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
        const functionCall = chunk.candidates?.[0]?.content?.parts?.[0]?.functionCall;

        let toolCall: ToolCall | undefined;
        if (functionCall && functionCall.name && typeof functionCall.name === 'string') {
          toolCall = {
            tool: functionCall.name,
            value: functionCall.args || {},
          };
        }

        if (text || toolCall) {
          yield { text, tool: toolCall };
        } else {
          console.warn(`[streamGemini] No valid text or tool call in chunk:`, JSON.stringify(chunk, null, 2));
        }
      }
    } catch (error) {
      console.error(`[streamGemini] Error in generator:`, error);
      throw error;
    }
  }

  return generator();
}

export const myProvider = customProvider({
  languageModels: {
    "gemini-2.5-pro": {
      specificationVersion: "v2",
      modelId: "gemini-2.5-pro",
      doGenerate: (options: any) => callGemini("gemini-2.5-pro", options),
      doStream: (options: any) => streamGemini("gemini-2.5-pro", options),
    } as any,
    "gemini-2.5-flash": {
      specificationVersion: "v2",
      modelId: "gemini-2.5-flash",
      doGenerate: (options: any) => callGemini("gemini-2.5-flash", options),
      doStream: (options: any) => streamGemini("gemini-2.5-flash", options),
    } as any,
    "gemini-2.5-flash-lite": {
      specificationVersion: "v2",
      modelId: "gemini-2.5-flash-lite",
      doGenerate: (options: any) => callGemini("gemini-2.5-flash-lite", options),
      doStream: (options: any) => streamGemini("gemini-2.5-flash-lite", options),
    } as any,
    "gemma-3": {
      specificationVersion: "v2",
      modelId: "models/gemma-3-12b-it",
      doGenerate: (options: any) => callGemini("models/gemma-3-12b-it", options),
      doStream: (options: any) => streamGemini("models/gemma-3-12b-it", options),
    } as any,
  },
});
