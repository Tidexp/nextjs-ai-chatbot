import { GoogleGenAI } from "@google/genai";
import { customProvider, convertToModelMessages } from "ai";

const ai = new GoogleGenAI({});

// ----- Helper: Lấy content string từ last message -----
function getContentFromLastMessage(messages: any[]): string {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return "";
  
  if (typeof lastMessage.content === "string") return lastMessage.content;
  if (Array.isArray(lastMessage.content)) {
    return lastMessage.content
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text || "")
      .join("");
  }
  return "";
}

// ----- Helper: Extract text/tool call từ chunk -----
type ToolCall = { tool: string; value: any };

function extractTextAndTool(chunk: any): { text?: string; tool?: ToolCall } {
  const contentPart = chunk?.candidates?.[0]?.content?.parts?.[0];
  if (!contentPart) return {};

  const text = contentPart.text;
  const functionCall = contentPart.functionCall;
  const tool = functionCall?.name ? { tool: functionCall.name, value: functionCall.args || {} } : undefined;

  return { text, tool };
}

// ----- Non-stream generate -----
async function callGemini(model: string, options: any) {
  const messages = convertToModelMessages(options.messages);
  const content = getContentFromLastMessage(messages);

  const response = await ai.models.generateContent({ model, contents: content });

  return {
    content: [{ type: "text" as const, text: response.text || "" }],
    finishReason: "stop" as const,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    warnings: [],
  };
}

// ----- Stream generate -----
async function streamGemini(model: string, options: any): Promise<AsyncIterable<{ text?: string; tool?: ToolCall }>> {
  const messages = convertToModelMessages(options.messages);
  const content = getContentFromLastMessage(messages);

  console.log(`[streamGemini] Calling generateContentStream with model: ${model}`);
  const responseIterator = await ai.models.generateContentStream({ model, contents: content });

  async function* generator() {
    try {
      for await (const chunk of responseIterator) {
        console.log(`[streamGemini] Received raw chunk:`, JSON.stringify(chunk, null, 2));
        const { text, tool } = extractTextAndTool(chunk);
        if (text || tool) yield { text, tool };
        else console.warn(`[streamGemini] Ignored chunk:`, JSON.stringify(chunk, null, 2));
      }
    } catch (error) {
      console.error(`[streamGemini] Error in generator:`, error);
      throw error;
    }
  }

  return generator();
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
