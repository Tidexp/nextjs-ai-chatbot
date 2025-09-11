import { z } from 'zod';

const textPartSchema = z.object({
  type: z.enum(['text']),
  text: z.string().min(1).max(16000),
});

const filePartSchema = z.object({
  type: z.enum(['file']),
  mediaType: z.enum(['image/jpeg', 'image/png', 'application/pdf', 'text/plain']),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

const messageSchema = z.object({
  role: z.enum(["user", "system", "assistant"]),
  content: z.union([
    z.string().min(1),          
    z.array(partSchema).min(1), 
  ]),
});

export const postRequestBodySchema = z.object({
  chatId: z.string().optional(), // Add chatId to the schema
  model: z.string().min(1), // ví dụ: "meta-llama/llama-guard-4-12b"
  messages: z.array(messageSchema).min(1),
  temperature: z.number().min(0).max(2).default(1),
  max_completion_tokens: z.number().min(1).max(8192).default(1024),
  top_p: z.number().min(0).max(1).default(1),
  stream: z.boolean().default(true),
  stop: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
