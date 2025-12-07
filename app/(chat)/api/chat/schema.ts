import { z } from 'zod';

// Text parts: we apply a base max for safety, but will allow
// larger assistant/system parts by expanding the limit after role check.
// Keep generous upper bound to avoid unbounded payload growth.
const textPartSchema = z.object({
  type: z.enum(['text']),
  // Set temporary high ceiling; user parts stricter via message-level refine.
  text: z.string().min(1).max(200000),
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
    id: z.string().optional(),
    metadata: z.any().optional(),
    createdAt: z.string().optional(),
  })
  .refine((data) => data.content || data.parts, {
    message: "Either 'content' or 'parts' must be provided",
  })
  // Enforce 16k limit only for USER text parts; assistant/system can be longer.
  .superRefine((data, ctx) => {
    const partsArray = Array.isArray(data.parts)
      ? data.parts
      : Array.isArray(data.content)
        ? data.content
        : typeof data.content === 'string'
          ? [{ type: 'text', text: data.content }]
          : [];
    if (data.role === 'user') {
      for (const p of partsArray) {
        if (
          p?.type === 'text' &&
          typeof p.text === 'string' &&
          p.text.length > 16000
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            maximum: 16000,
            type: 'string',
            inclusive: true,
            exact: false,
            message: 'User text must be <= 16000 characters',
            path: ['content', 0, 'text'],
          });
        }
      }
    }
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
  chatType: z.enum(['general', 'lesson', 'instructor']).optional(), // Chat type
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
