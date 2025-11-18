import { z } from 'zod';

const textPartSchema = z.object({
  type: z.enum(['text']),
  text: z.string().min(1).max(16000),
});

const filePartSchema = z
  .object({
    type: z.enum(['file']),
    mediaType: z.enum([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
    ]),
    name: z.string().min(1).max(100),
    url: z.string().url().optional(),
    file: z.string().url().optional(),
  })
  .refine((data) => data.url || data.file, {
    message: "Either 'url' or 'file' must be provided",
  });

const imagePartSchema = z.object({
  type: z.enum(['image']),
  image: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema, imagePartSchema]);

const messageSchema = z
  .object({
    role: z.enum(['user', 'system', 'assistant']),
    content: z.union([z.string(), z.array(partSchema)]).optional(),
    parts: z.array(partSchema).optional(),
    id: z.string().optional(), // Allow optional id field
    metadata: z.any().optional(), // Allow optional metadata
    createdAt: z.string().optional(), // Allow createdAt field
  })
  .refine((data) => data.content || data.parts, {
    message: "Either 'content' or 'parts' must be provided",
  });

export const postRequestBodySchema = z.object({
  id: z.string().optional(), // Chat ID from AI SDK
  chatId: z.string().optional(), // Alternative chatId field
  model: z.string().min(1).optional(), // Make model optional with default
  messages: z.array(messageSchema).min(1),
  temperature: z.number().min(0).max(2).default(1),
  max_completion_tokens: z.number().min(1).max(8192).default(1024),
  top_p: z.number().min(0).max(1).default(1),
  stream: z.boolean().default(true),
  stop: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  trigger: z.string().optional(), // Trigger field from AI SDK
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
