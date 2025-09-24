import {
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getChatsByUserId,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
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
export const dynamic = 'force-dynamic';

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
          if (part.type === 'image') {
            // Handle direct image parts
            return { type: 'image' as const, image: part.image };
          }
          if (part.type === 'file' && part.mediaType.startsWith('image/')) {
            // Convert valid image files to the 'image' part type
            const fileUrl = part.url || part.file;
            return { type: 'image' as const, image: fileUrl };
          }
          if (part.type === 'file' && (part.mediaType === 'application/pdf' || part.mediaType === 'text/plain')) {
            // Convert PDF and text files to the 'file' part type
            const fileUrl = part.url || part.file;
            return { type: 'file' as const, file: fileUrl, mediaType: part.mediaType, name: part.name };
          }
          // Any other part type (like non-image files) will be ignored
          return null;
        })
        .filter(p => p !== null); // Remove null entries
    } else if (typeof msg.content === 'string') {
      parts = [{ type: 'text' as const, text: msg.content }];
    }

    return {
      id: msg.id || generateUUID(), // Preserve original ID if it exists, otherwise generate new one
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
    
    // The AI SDK sends requests to /api/chat by default, not /api/chat/{id}
    // We need to extract the chat ID from the request body or use a different approach
    
    // For now, let's check if there's a chatId in the request body
    console.log("[POST] Request URL:", request.url);
    console.log("[POST] Request body chatId:", requestBody.chatId);
    
    // If no chatId in body, we need to generate one or find another way
    // The AI SDK's useChat hook should maintain the same chat ID across messages
    // Normalize messages: ensure content is always an array of parts
    requestBody.messages = requestBody.messages.map((msg) => {
      // Handle both 'content' and 'parts' formats
      if (msg.parts) {
        return {
          ...msg,
          content: msg.parts,
        };
      } else if (!Array.isArray(msg.content)) {
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

    // Use default model if none provided
    const model = requestedModel || 'gemini-2.5-flash';

    console.log(`[POST] Requested model: ${requestedModel}`);
    console.log(`[POST] Using model: ${model}`);
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
    const validModel = chatModels.find(m => m.id === model);
    if (!validModel) {
      console.warn(`[POST] Model ${model} not found in chatModels.`);
      return new ChatSDKError('bad_request:api').toResponse();
    }

    // Check if user can use the requested model
    if (!userEntitlements.availableChatModelIds.includes(model)) {
      console.warn(`[POST] User not entitled to model ${model}.`);
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    const selectedChatModel = model;
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

    // Extract or generate chat ID (handle both 'id' and 'chatId' fields from AI SDK)
    let chatId = requestBody.chatId || requestBody.id;
    
    // If no chatId provided, try to find an existing chat based on the messages
    if (!chatId && messages.length > 0) {
      console.log(`[POST] No chatId provided, trying to find existing chat`);
      
      // If there are multiple messages, this might be a continuation of an existing chat
      // The AI SDK sends all messages together, so we can use this to find the existing chat
      if (messages.length > 1) {
        // Get the first user message to identify the chat
        const firstUserMessage = messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
          console.log(`[POST] Multiple messages detected, looking for existing chat`);
          
          // Try to find a chat that has this first message
          // This is a simplified approach - in a real app you might want more sophisticated matching
          const userChats = await getChatsByUserId({ 
            id: session.user.id,
            limit: 10,
            startingAfter: null,
            endingBefore: null
          });
          
          // For now, let's use the most recent chat as a fallback
          if (userChats.chats.length > 0) {
            const mostRecentChat = userChats.chats[0]; // They're sorted by creation date desc
            chatId = mostRecentChat.id;
            console.log(`[POST] Found existing chat: ${chatId}`);
          }
        }
      }
    }
    
    // Generate a new chatId if none found
    if (!chatId) {
      chatId = generateUUID();
      console.log(`[POST] Generating new chatId: ${chatId}`);
    }
    
    console.log(`[POST] Received chatId from request: ${requestBody.chatId}`);
    console.log(`[POST] Using chatId: ${chatId}`);

    const chat = await getChatById({ id: chatId });
    let isNewChat = false;

    if (!chat) {
        console.log(`[POST] No chat found, creating new chat with ID: ${chatId}`);
        await saveChat({
            id: chatId,
            userId: session.user.id,
            title: 'New Chat',
            visibility: 'private' as VisibilityType,
        });
        isNewChat = true;
        // Notify client sidebars to refresh via SSE-compatible comment event
        // Clients can't receive this directly from API, so we rely on the page JS to dispatch a custom event.
    } else if (chat) {
        if (chat.userId !== session.user.id) {
            console.warn(`[POST] Chat userId does not match session userId.`);
            return new ChatSDKError('forbidden:chat').toResponse();
        }
    }

    // Get existing messages from database
    const messagesFromDb = await getMessagesByChatId({ id: chatId });
    const existingUIMessages = convertToUIMessages(messagesFromDb);
    console.log(`[POST] Existing UI Messages from DB:`, JSON.stringify(existingUIMessages, null, 2));

    // Convert schema messages to UI messages
    const uiMessages = convertSchemaMessagesToUIMessages(messages);
    console.log(`[POST] UI Messages from request:`, JSON.stringify(uiMessages, null, 2));

    // The AI SDK sends ALL messages in the conversation, but we only want to save the NEW user message
    // Find the last user message that's not already in the database
    const newUserMessages: ChatMessage[] = [];
    for (const msg of uiMessages) {
      if (msg.role === 'user') {
        // First check if this message already exists by ID (more reliable)
        const existsById = existingUIMessages.some(existing => 
          existing.id === msg.id
        );
        
        // If not found by ID, check by content (fallback for messages without IDs)
        const existsByContent = !existsById && existingUIMessages.some(existing => 
          existing.role === 'user' && 
          JSON.stringify((existing as any).parts || []) === JSON.stringify(msg.parts || [])
        );
        
        if (!existsById && !existsByContent) {
          newUserMessages.push(msg);
        }
      }
    }

    console.log(`[POST] New user messages to save:`, JSON.stringify(newUserMessages, null, 2));

    // For AI processing, use the messages from the request (which includes full conversation history)
    const messagesForAI = uiMessages;

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

    // Get the last user message for title generation
    const lastUserMessage = newUserMessages.length > 0 ? newUserMessages[newUserMessages.length - 1] : null;

    // Title generation disabled - all chats will show as "New Chat"
    // if (isNewChat && lastUserMessage) {
    //   console.log(`[POST] Generating title from user message:`, JSON.stringify(lastUserMessage, null, 2));
    //   
    //   // Start title generation immediately, don't wait for AI response
    //   (async () => {
    //     try {
    //       const { generateTitleFromUserMessage } = await import('@/app/(chat)/actions');
    //       const generatedTitle = await generateTitleFromUserMessage({
    //         message: lastUserMessage as any,
    //       });
    //       const userText = (lastUserMessage as any).parts?.find((p: any) => p.type === 'text')?.text || 'no text';
    //       console.log(`[POST] Generated title: "${generatedTitle}" from user message: "${userText}"`);
    //       
    //       if (generatedTitle && generatedTitle.trim() && generatedTitle !== 'New Chat') {
    //         await updateChatTitleById({ chatId, title: generatedTitle });
    //         console.log(`[POST] Updated chat title to: ${generatedTitle}`);
    //       }
    //     } catch (error) {
    //       console.warn('[POST] Failed to generate title:', error);
    //     }
    //   })(); // Run immediately, no delay
    // }

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId });
    console.log(`[POST] Created stream ID: ${streamId}`);

    // Use the custom provider directly for streaming
    const result = await myProvider.languageModel(selectedChatModel as GeminiModelId).doStream({
      prompt: messagesForAI
        .filter(msg => msg.role !== 'system')
          .map(msg => {
            const parts = (msg as any).parts || [];
          return {
            role: msg.role as 'user' | 'assistant',
            content: parts.length > 0 ? parts : [{ type: 'text', text: '' }],
          };
        }),
    });

     // Convert the stream to proper SSE format that useChat expects
     const responseStream = new ReadableStream({
       async start(controller) {
         try {
           console.log('[POST] ===== SSE STREAM STARTED =====');
           
           let fullText = '';
           let messageId = generateUUID();
           let hasStarted = false;
           
           const reader = result.stream.getReader();
           try {
             while (true) {
               const { done, value } = await reader.read();
               if (done) break;
               
               const chunk = value;
               if (chunk.type === 'text-delta' && chunk.delta) {
                 console.log('[POST] Streaming chunk:', chunk.delta.slice(0, 50) + (chunk.delta.length > 50 ? '...' : ''));
                 fullText += chunk.delta;
                 
                 // Check if controller is still open
                 if (controller.desiredSize === null) {
                   console.log('[POST] Controller closed, stopping stream');
                   break;
                 }
                 
                 // Send text-start event first (only once)
                 if (!hasStarted) {
                   hasStarted = true;
                   const startEvent = `data: ${JSON.stringify({ type: 'text-start', id: messageId })}\n\n`;
                   console.log('[POST] Sending start event:', startEvent);
                   controller.enqueue(new TextEncoder().encode(startEvent));
                 }
                 
                 // Send text-delta event in the format useChat expects
                 const deltaEvent = `data: ${JSON.stringify({ 
                   type: 'text-delta', 
                   id: messageId, 
                   delta: chunk.delta 
                 })}\n\n`;
                 console.log('[POST] Sending delta event:', deltaEvent.slice(0, 100) + '...');
                 controller.enqueue(new TextEncoder().encode(deltaEvent));
               }
             }
           } finally {
             reader.releaseLock();
           }
           
           // Send text-end event
           if (hasStarted && controller.desiredSize !== null) {
             const endEvent = `data: ${JSON.stringify({ type: 'text-end', id: messageId })}\n\n`;
             console.log('[POST] Sending end event:', endEvent);
             controller.enqueue(new TextEncoder().encode(endEvent));
           }
           
           // Save the final message to database
           if (fullText.trim()) {
             const finalMessage = {
               id: messageId,
               role: 'assistant' as const,
               parts: [{ type: 'text' as const, text: fullText }],
               createdAt: new Date().toISOString(),
               attachments: [],
             };

             await saveMessages({
               messages: [{
                 id: finalMessage.id,
                 role: finalMessage.role,
                 parts: finalMessage.parts,
                 createdAt: new Date(),
                 attachments: [],
                 chatId,
               }],
             });
           }
           
           // Close the controller after sending text-end
           if (controller.desiredSize !== null) {
             controller.close();
           }
           console.log('[POST] ===== SSE STREAM COMPLETED =====');
         } catch (error) {
           console.error('[POST] SSE Stream error:', error);
           if (controller.desiredSize !== null) {
             try {
               const errorEvent = `data: ${JSON.stringify({ type: 'error', id: generateUUID(), error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`;
               controller.enqueue(new TextEncoder().encode(errorEvent));
               controller.close();
             } catch (err) {
               console.log('[POST] Failed to send error, controller closed');
             }
           }
         }
       },
     });

    console.log('[POST] Returning SSE streaming response with headers:', {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

     return new Response(responseStream, {
       headers: {
         'Content-Type': 'text/event-stream',
         'Cache-Control': 'no-cache',
         'Connection': 'keep-alive',
         'Access-Control-Allow-Origin': '*',
         'Access-Control-Allow-Headers': 'Cache-Control',
         'X-Accel-Buffering': 'no',
       },
     });
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