import { GoogleGenAI } from "@google/genai";
import {
  customProvider,
  convertToModelMessages
} from "ai";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});

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

async function* streamGemini(model: string, options: any) {
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

  const response = await ai.models.generateContentStream({
    model,
    contents: content,
  });

  for await (const chunk of response) {
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      yield {
        type: "content-delta" as const,
        textDelta: text,
      };
    }
  }

  yield {
    type: "finish" as const,
    finishReason: "stop" as const,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
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
