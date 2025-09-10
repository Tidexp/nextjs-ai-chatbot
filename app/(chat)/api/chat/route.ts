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
  return messages.map((msg) => {
    let parts: any[] = [];

    if (Array.isArray(msg.content)) {
      // Map and filter in one step. Only keep valid parts.
      parts = msg.content
        .map((part) => {
          if (part.type === 'text') {
            return { type: 'text' as const, text: part.text };
          }
          if (part.type === 'file' && part.mediaType.startsWith('image/')) {
            // Convert valid image files to the 'image' part type
            return { type: 'image' as const, image: part.url };
          }
          if (part.type === 'file' && (part.mediaType === 'application/pdf' || part.mediaType === 'text/plain')) {
            // Convert PDF and text files to the 'file' part type
            return { type: 'file' as const, file: part.url, mediaType: part.mediaType, name: part.name };
          }
          // Any other part type (like non-image files) will be ignored
          return null;
        })
        .filter(p => p !== null); // Remove null entries
    } else if (typeof msg.content === 'string') {
      parts = [{ type: 'text' as const, text: msg.content }];
    }

    return {
      id: generateUUID(),
      role: msg.role,
      parts, // Use the cleaned and validated parts array
      createdAt: new Date().toISOString(),
    };
  });
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
    console.log(`[POST] Stream type: ${typeof stream}`);
    console.log(`[POST] Stream value: ${JSON.stringify(stream)}`);
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

        const streamMessages = allUIMessages
            .filter(msg => msg.role !== 'system') // Lọc bỏ message hệ thống vì đã có thuộc tính 'system' riêng
          .map(msg => {
            const parts = (msg as any).parts || [];
            const processed = {
              role: msg.role as 'user' | 'assistant', // Ép kiểu role cho tương thích
              content: parts.length > 0 ? parts : [{ type: 'text', text: '' }], // Ensure we always have valid content
            };
            console.log(`[POST] Processed message for streamText:`, JSON.stringify(processed, null, 2));
            return processed;
          });
        
        console.log(`[POST] All processed messages for streamText:`, JSON.stringify(streamMessages, null, 2));
        
        // Use our custom provider directly for streaming
        const result = await myProvider.languageModel(selectedChatModel as GeminiModelId).doStream({
          prompt: streamMessages,
          temperature: 1,
          maxTokens: 1024,
          topP: 1,
        } as any);

        // Process the stream from our custom provider
        console.log('[POST] Starting to consume stream...');
        const reader = result.stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const anyChunk: any = value as any;
            const text = anyChunk.textDelta || anyChunk.delta || anyChunk.text || '';
            
            if (text) {
              if (!started) {
                started = true;
                await dataStream.write({ type: 'text-start', id: currentId });
              }

              await dataStream.write({
                type: 'text-delta',
                id: currentId,
                delta: text,
              });
            }
          }

            if (started) {
              await dataStream.write({ type: 'text-end', id: currentId });
            }
        } finally {
          reader.releaseLock();
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
      // For multimodal messages, force streaming to avoid issues with generateText
      const hasMultimodalContent = allUIMessages.some(msg => 
        (msg as any).parts?.some((part: any) => 
          part.type === 'image' || 
          (part.type === 'file' && (part.mediaType === 'application/pdf' || part.mediaType === 'text/plain'))
        )
      );
      
      let fullText = '';
      
      if (hasMultimodalContent) {
        console.log('[POST] Detected multimodal content, using streaming instead of generateText');
        // Use our custom provider directly for multimodal processing
        console.log('[POST] Using custom provider directly for multimodal processing');
        
        let result;
        let currentModel = selectedChatModel;
        
        try {
          result = await myProvider.languageModel(currentModel as GeminiModelId).doStream({
            prompt: allUIMessages
              .filter(msg => msg.role !== 'system')
              .map(msg => {
                const parts = (msg as any).parts || [];
                return {
                  role: msg.role as 'user' | 'assistant',
                  content: parts,
                };
              }),
            temperature: 1,
            maxTokens: 1024,
            topP: 1,
          } as any);
        } catch (error: any) {
          // If the requested model is overloaded, show user-friendly message
          if (error?.status === 503) {
            console.log(`[POST] ${currentModel} overloaded, informing user`);
            fullText = `⚠️ **Model Overload Notice**\n\nThe ${currentModel} model is currently experiencing high demand and is temporarily unavailable. This is a temporary issue on Google's side.\n\n**What you can do:**\n- Try again in a few minutes\n- Switch to a different model (like gemini-2.5-flash)\n- The image processing is working correctly - this is just a capacity issue\n\n*Error details: ${error?.message || 'Service temporarily unavailable'}*`;
            return Response.json({
              type: 'message',
              message: {
                id: generateUUID(),
                role: 'assistant',
                parts: [{ type: 'text', text: fullText }],
                createdAt: new Date().toISOString(),
                attachments: [],
              },
              parts: [{ type: 'text', text: fullText }],
              text: fullText,
            });
          } else {
            throw error;
          }
        }
        
        // Process the stream from our custom provider
        const reader = result.stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const anyChunk: any = value as any;
            const t = anyChunk.textDelta || anyChunk.delta || anyChunk.text || '';
            if (t) fullText += t;
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        // Use generateText for text-only messages
        try {
        const processedMessages = allUIMessages
          .filter(msg => msg.role !== 'system') // Lọc bỏ message hệ thống vì đã có thuộc tính 'system' riêng
          .map(msg => {
            const parts = (msg as any).parts || [];
            
            // Convert parts to the format expected by the AI SDK
            const content = parts.map((part: any) => {
              if (part.type === 'text') {
                return { type: 'text', text: part.text || '' };
              } else if (part.type === 'image') {
                return { 
                  type: 'image', 
                  image: part.image 
                };
              } else if (part.type === 'file' && (part.mediaType === 'application/pdf' || part.mediaType === 'text/plain')) {
                return {
                  type: 'file',
                  file: part.file || part.url,
                  mediaType: part.mediaType,
                  name: part.name
                };
              }
              // Skip unknown part types
              return null;
            }).filter((part: any) => part !== null);
            
            const processed = {
              role: msg.role as 'user' | 'assistant',
              content: content.length > 0 ? content : [{ type: 'text', text: '' }],
            };
            console.log(`[POST] Processed message for generateText:`, JSON.stringify(processed, null, 2));
            return processed;
          });
        
        console.log(`[POST] All processed messages for generateText:`, JSON.stringify(processedMessages, null, 2));
        
        const result = await generateText({
          model: myProvider.languageModel(selectedChatModel as GeminiModelId),
          system: systemPrompt({ selectedChatModel }),
          messages: processedMessages,
        });
        fullText = result.text || '';
      } catch (genErr: any) {
          // Check if it's a model overload error
          if (genErr?.status === 503) {
            console.log(`[POST] ${selectedChatModel} overloaded in generateText, informing user`);
            fullText = `⚠️ **Model Overload Notice**\n\nThe ${selectedChatModel} model is currently experiencing high demand and is temporarily unavailable. This is a temporary issue on Google's side.\n\n**What you can do:**\n- Try again in a few minutes\n- Switch to a different model (like gemini-2.5-flash)\n- The image processing is working correctly - this is just a capacity issue\n\n*Error details: ${genErr?.message || 'Service temporarily unavailable'}*`;
            
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
          
        console.warn('[POST] generateText failed, falling back to streamText:', genErr?.message || genErr);
        // Fallback: stream and assemble
          const fallbackMessages = allUIMessages
            .filter(msg => msg.role !== 'system') // Lọc bỏ message hệ thống vì đã có thuộc tính 'system' riêng
            .map(msg => {
              const parts = (msg as any).parts || [];
              const processed = {
              role: msg.role as 'user' | 'assistant', // Ép kiểu role cho tương thích
                content: parts.length > 0 ? parts : [{ type: 'text', text: '' }], // Ensure we always have valid content
              };
              console.log(`[POST] Processed message for streamText fallback:`, JSON.stringify(processed, null, 2));
              return processed;
            });
          
          console.log(`[POST] All processed messages for streamText fallback:`, JSON.stringify(fallbackMessages, null, 2));
          
          const result = await streamText({
            model: myProvider.languageModel(selectedChatModel as GeminiModelId),
            system: systemPrompt({ selectedChatModel }),
            messages: fallbackMessages,
        });
        for await (const chunk of result.textStream) {
          const anyChunk: any = chunk as any;
          const t = anyChunk.textDelta || anyChunk.delta || anyChunk.text || '';
          if (t) fullText += t;
          }
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