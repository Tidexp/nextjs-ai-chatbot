import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  streamText,
  StreamTextResult,
  generateText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { myProvider, type GeminiModelId } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import { chatModels } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

// Helper function to convert schema messages to internal ChatMessage format
function convertSchemaMessagesToUIMessages(messages: PostRequestBody['messages']): any[] {
  return messages.map((msg) => ({
    id: generateUUID(),
    role: msg.role,
    parts: Array.isArray(msg.content)
      ? msg.content.map((part) => {
          if (part.type === "text") {
            return { type: "text" as const, text: part.text };
          } else if (part.type === "file") {
            return { type: "image" as const, image: part.url };
          }
          return { type: "text" as const, text: JSON.stringify(part) };
        })
      : [
          {
            type: "text" as const,
            text:
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content),
          },
        ],
    createdAt: new Date().toISOString(),
  }));
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    console.log("[POST] Raw request body:", JSON.stringify(json, null, 2));
    requestBody = postRequestBodySchema.parse(json);
    // Normalize messages: ensure content is always an array of parts
    requestBody.messages = requestBody.messages.map((msg) => {
      if (!Array.isArray(msg.content)) {
        return {
          ...msg,
          content: [
            {
              type: "text",
              text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
            },
          ],
        };
      }
      return msg;
    });
    console.log("[POST] Parsed request body:", JSON.stringify(requestBody, null, 2));
  } catch (error) {
    console.error("[POST] Error parsing request body:", error);
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      model: requestedModel,
      messages,
      temperature,
      max_completion_tokens,
      top_p,
      stream,
      stop,
    } = requestBody;

    console.log(`[POST] Requested model: ${requestedModel}`);
    console.log(`[POST] Messages:`, JSON.stringify(messages, null, 2));
    console.log(`[POST] Temperature: ${temperature}`);
    console.log(`[POST] Max completion tokens: ${max_completion_tokens}`);
    console.log(`[POST] Top P: ${top_p}`);
    console.log(`[POST] Stream: ${stream}`);
    console.log(`[POST] Stop: ${JSON.stringify(stop)}`);

    // Check for Groq API key in environment, if relevant (example, adjust variable as needed)
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.warn("[POST] GEMINI_API_KEY is missing from environment!");
    } else {
      console.log("[POST] GEMINI_API_KEY is present.");
    }

    const session = await auth();

    if (!session?.user) {
      console.warn("[POST] No user session, unauthorized.");
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;
    const userEntitlements = entitlementsByUserType[userType];

    // Validate the requested model exists
    const validModel = chatModels.find(model => model.id === requestedModel);
    if (!validModel) {
      console.warn(`[POST] Requested model ${requestedModel} not found in chatModels.`);
      return new ChatSDKError('bad_request:api').toResponse();
    }

    // Check if user can use the requested model
    if (!userEntitlements.availableChatModelIds.includes(requestedModel)) {
      console.warn(`[POST] User not entitled to model ${requestedModel}.`);
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    const selectedChatModel = requestedModel;
    console.log(`[POST] Selected chat model: ${selectedChatModel}`);

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });
    console.log(`[POST] Message count for user ${session.user.id}: ${messageCount}`);

    if (messageCount >= userEntitlements.maxMessagesPerDay) {
      console.warn(`[POST] Message count exceeded for user.`);
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    // Extract or generate chat ID
    let chatId = (requestBody as any).chatId || generateUUID();
    console.log(`[POST] Chat ID: ${chatId}`);

    // Convert schema messages to UI messages
    const uiMessages = convertSchemaMessagesToUIMessages(messages);
    console.log(`[POST] UI Messages:`, JSON.stringify(uiMessages, null, 2));

    // Get the last user message for title generation
    const lastUserMessage = uiMessages.filter(msg => msg.role === 'user').pop() as ChatMessage | undefined;
    console.log(`[POST] Last user message:`, JSON.stringify(lastUserMessage, null, 2));

    const chat = await getChatById({ id: chatId });

    if (!chat) {
        console.log(`[POST] No chat found, creating new chat with ID: ${chatId}`);
        await saveChat({
            id: chatId,
            userId: session.user.id,
            title: 'New Chat',
            visibility: 'private' as VisibilityType,
        });
    } else if (chat) {
        if (chat.userId !== session.user.id) {
            console.warn(`[POST] Chat userId does not match session userId.`);
            return new ChatSDKError('forbidden:chat').toResponse();
        }
    }

    const messagesFromDb = await getMessagesByChatId({ id: chatId });
    const existingUIMessages = convertToUIMessages(messagesFromDb);
    console.log(`[POST] Existing UI Messages from DB:`, JSON.stringify(existingUIMessages, null, 2));

    // Merge existing messages with new messages, avoiding duplicates
    const allUIMessages = [...existingUIMessages];

    // Only add new user messages that aren't already in the database
    const newUserMessages = uiMessages.filter(msg => 
      msg.role === 'user' && !existingUIMessages.some(existing => 
        existing.role === 'user' && 
        JSON.stringify((existing as any).content || (existing as any).parts || []) === JSON.stringify(msg.content)
      )
    ) as ChatMessage[];

    allUIMessages.push(...newUserMessages);

    // Save new user messages to database
    if (newUserMessages.length > 0) {
      console.log(`[POST] Saving new user messages to DB:`, JSON.stringify(newUserMessages, null, 2));
      await saveMessages({
        messages: newUserMessages.map((message) => ({
          chatId,
          id: message.id,
          role: 'user',
          parts: (message as any).content || (message as any).parts || [],
          attachments: [],
          createdAt: new Date(),
        })),
      });
    }

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId });
    console.log(`[POST] Created stream ID: ${streamId}`);

    const streamResponse = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        let started = false;
        let currentId = generateUUID();

        const result = await streamText({
          model: myProvider.languageModel(selectedChatModel as GeminiModelId),
          system: systemPrompt({ selectedChatModel }),
          messages: convertToModelMessages(allUIMessages),

          onChunk: async (event) => {
            try {
              const anyEvent = event as any;
              const text =
                anyEvent.textDelta ??
                anyEvent.delta ??
                anyEvent?.delta?.text ??
                anyEvent?.chunk?.candidates?.[0]?.content?.parts?.[0]?.text;

              if (!text) return;

              if (!started) {
                started = true;
                await dataStream.write({ type: 'text-start', id: currentId });
              }

              await dataStream.write({
                type: 'text-delta',
                id: currentId,
                delta: text,
              });
            } catch (err) {
              console.error('[POST] onChunk error:', err);
            }
          },

          onFinish: async () => {
            if (started) {
              await dataStream.write({ type: 'text-end', id: currentId });
            }
          },
        });

        // IMPORTANT: Consume the stream to trigger the provider
        console.log('[POST] Starting to consume stream...');
        for await (const chunk of result.textStream) {
          console.log('[POST] Consuming chunk:', chunk);
          // The onChunk callback should handle this, but we need to consume the stream
        }
        console.log('[POST] Stream consumption completed');
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((m) => ({
            id: m.id,
            role: m.role,
            parts: (m as any).content || (m as any).parts || [{ type: "text", text: "" }],
            createdAt: new Date(),
            attachments: [],
            chatId,
          })),
        });
      },
      onError: (err) => {
        console.error("[POST] UIMessageStream error:", err);
        return "Oops, an error occurred!";
      }      
    });        

    const streamContext = getStreamContext();
    console.log(`[POST] Stream context:`, !!streamContext);

    if (stream) {
      // Always return basic SSE stream (disable resumable)
      return new Response(streamResponse.pipeThrough(new JsonToSseTransformStream()), {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // Non-streaming: prefer generateText; fallback to streaming on provider 503
      let fullText = '';
      try {
        const result = await generateText({
          model: myProvider.languageModel(selectedChatModel as GeminiModelId),
          system: systemPrompt({ selectedChatModel }),
          messages: convertToModelMessages(allUIMessages),
        });
        fullText = result.text || '';
      } catch (genErr: any) {
        console.warn('[POST] generateText failed, falling back to streamText:', genErr?.message || genErr);
        // Fallback: stream and assemble
        const result = await streamText({
          model: myProvider.languageModel(selectedChatModel as GeminiModelId),
          system: systemPrompt({ selectedChatModel }),
          messages: convertToModelMessages(allUIMessages),
        });
        for await (const chunk of result.textStream) {
          const anyChunk: any = chunk as any;
          const t = anyChunk.textDelta || anyChunk.delta || anyChunk.text || '';
          if (t) fullText += t;
        }
      }

      if (!fullText || !fullText.trim()) {
        fullText = 'Sorry, I could not generate a response. Please try again.';
      }

      // Save assistant message
      const assistantId = generateUUID();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        parts: [{ type: 'text', text: fullText }] as any,
        createdAt: new Date().toISOString(),
        attachments: [],
      } as any;

      await saveMessages({
        messages: [
          {
            id: assistantId,
            role: 'assistant',
            parts: assistantMessage.parts as any,
            createdAt: new Date(),
            attachments: [],
            chatId,
          },
        ],
      });

      return Response.json({
        type: 'message',
        message: assistantMessage,
        parts: assistantMessage.parts,
        text: fullText,
      });
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      console.error('[POST] ChatSDKError:', error);
      return error.toResponse();
    }

    console.error('[POST] Unexpected error:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  console.log(`[DELETE] Chat ID to delete: ${id}`);

  if (!id) {
    console.warn(`[DELETE] No chat ID provided.`);
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    console.warn(`[DELETE] No user session, unauthorized.`);
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    console.warn(`[DELETE] Chat not found.`);
    return new ChatSDKError('bad_request:api').toResponse();
  }

  if (chat.userId !== session.user.id) {
    console.warn(`[DELETE] Chat userId does not match session userId.`);
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  console.log(`[DELETE] Deleted chat:`, JSON.stringify(deletedChat, null, 2));
  return Response.json(deletedChat, { status: 200 });
}