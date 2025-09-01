import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
  UIMessage,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
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
import { generateTitleFromUserMessage } from '../../actions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import { chatModels, DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
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
  if (!Array.isArray(messages)) {
    console.error('[convertSchemaMessagesToUIMessages] Messages is not an array:', messages);
    return [];
  }

  return messages.map((msg) => {
    if (!msg || typeof msg !== 'object') {
      console.error('[convertSchemaMessagesToUIMessages] Invalid message:', msg);
      return null;
    }

    const content = Array.isArray(msg.content) ? msg.content : 
                   typeof msg.content === 'string' ? [{ type: 'text', text: msg.content }] : [];

    return {
      id: generateUUID(),
      role: msg.role,
      content: content.map((part: any) => {
        if (!part || typeof part !== 'object') {
          return { type: 'text', text: String(part) };
        }

        if (part.type === 'text') {
          return {
            type: 'text' as const,
            text: part.text || '',
          };
        } else if (part.type === 'image' || part.url) {
          // For file parts, map to image format
          return {
            type: 'image' as const,
            image: part.url || part.image,
          };
        } else {
          // Fallback for unknown content types
          return {
            type: 'text' as const,
            text: JSON.stringify(part),
          };
        }
      }),
      createdAt: new Date().toISOString(),
    };
  }).filter(Boolean);
}

// Helper function to extract chat ID from messages or generate new one
function extractOrGenerateChatId(messages: PostRequestBody['messages'], requestUrl?: string): string {
  // Try to extract chat ID from URL or headers first
  if (requestUrl) {
    const url = new URL(requestUrl);
    const chatIdFromUrl = url.searchParams.get('chatId');
    if (chatIdFromUrl) return chatIdFromUrl;
  }

  // Try to find chat ID in system message
  if (Array.isArray(messages)) {
    const systemMessage = messages.find(msg => msg?.role === 'system');
    if (systemMessage && typeof systemMessage.content === 'string') {
      const chatIdMatch = systemMessage.content.match(/chatId:\s*([a-fA-F0-9-]+)/);
      if (chatIdMatch) return chatIdMatch[1];
    }
  }

  // Generate new chat ID
  return generateUUID();
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    console.log("[POST] Raw request body:", JSON.stringify(json, null, 2));
    
    // Add more detailed validation logging
    if (!json) {
      console.error("[POST] Request body is null or undefined");
      return new ChatSDKError('bad_request:api').toResponse();
    }

    requestBody = postRequestBodySchema.parse(json);
    console.log("[POST] Parsed request body:", JSON.stringify(requestBody, null, 2));
  } catch (error) {
    console.error("[POST] Schema validation error:", error);
    if (error instanceof Error) {
      console.error("[POST] Error details:", error.message);
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      model: requestedModel,
      messages,
      temperature,
      max_completion_tokens,
      top_p,
      stream = true, // Default to true if not specified
      stop,
    } = requestBody;

    // Validate required fields
    if (!requestedModel) {
      console.error("[POST] Missing model in request");
      return new ChatSDKError('bad_request:api').toResponse();
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[POST] Missing or invalid messages array");
      return new ChatSDKError('bad_request:api').toResponse();
    }

    const session = await auth();

    if (!session?.user) {
      console.error("[POST] No authenticated user");
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;
    const userEntitlements = entitlementsByUserType[userType];

    // Validate the requested model exists
    const validModel = chatModels.find(model => model.id === requestedModel);
    if (!validModel) {
      console.error("[POST] Invalid model requested:", requestedModel);
      return new ChatSDKError('bad_request:api').toResponse();
    }

    // Check if user can use the requested model
    if (!userEntitlements.availableChatModelIds.includes(requestedModel)) {
      console.error("[POST] User not entitled to model:", requestedModel);
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    const selectedChatModel = requestedModel;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount >= userEntitlements.maxMessagesPerDay) {
      console.error("[POST] User exceeded daily message limit");
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    // Extract or generate chat ID
    const chatId = extractOrGenerateChatId(messages, request.url);
    console.log("[POST] Using chat ID:", chatId);
    
    // Convert schema messages to UI messages
    const uiMessages = convertSchemaMessagesToUIMessages(messages);
    console.log("[POST] Converted UI messages:", uiMessages.length);
    
    if (uiMessages.length === 0) {
      console.error("[POST] No valid messages after conversion");
      return new ChatSDKError('bad_request:api').toResponse();
    }

    // Get the last user message for title generation
    const lastUserMessage = uiMessages.filter(msg => msg?.role === 'user').pop() as ChatMessage | undefined;

    const chat = await getChatById({ id: chatId });

    if (!chat && lastUserMessage) {
      const title = await generateTitleFromUserMessage({
        message: lastUserMessage,
      });

      await saveChat({
        id: chatId,
        userId: session.user.id,
        title,
        visibility: 'private' as VisibilityType, // Default visibility
      });
    } else if (chat) {
      if (chat.userId !== session.user.id) {
        console.error("[POST] User does not own chat");
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id: chatId });
    const existingUIMessages = convertToUIMessages(messagesFromDb);
    
    // Merge existing messages with new messages, avoiding duplicates
    const allUIMessages = [...existingUIMessages];
    
    // Only add new user messages that aren't already in the database
    const newUserMessages = uiMessages.filter(msg => 
      msg?.role === 'user' && !existingUIMessages.some(existing => 
        existing?.role === 'user' && 
        JSON.stringify((existing as any).content || (existing as any).parts || []) === JSON.stringify(msg.content)
      )
    ) as ChatMessage[];

    allUIMessages.push(...newUserMessages);

    // Get geolocation data safely
    let requestHints: RequestHints;
    try {
      const { longitude, latitude, city, country } = geolocation(request);
      requestHints = { longitude, latitude, city, country };
    } catch (geoError) {
      console.warn("[POST] Geolocation failed:", geoError);
      requestHints = { longitude: null, latitude: null, city: null, country: null };
    }

    // Save new user messages to database
    if (newUserMessages.length > 0) {
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

    const streamResponse = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const toolsConfig = {
          experimental_activeTools:
            selectedChatModel !== "meta-llama/llama-guard-4-12b"
              ? ([
                  "getWeather",
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                ] as (
                  | "getWeather"
                  | "createDocument"
                  | "updateDocument"
                  | "requestSuggestions"
                )[])
              : [],
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({ session, dataStream }),
          },
        };

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(allUIMessages),
          temperature,
          maxTokens: max_completion_tokens,
          topP: top_p,
          stopSequences: stop,
          ...toolsConfig,
          experimental_transform: smoothStream({ chunking: "word" }) as any,
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: (message as any).content || (message as any).parts || [],
            createdAt: new Date(),
            attachments: [],
            chatId,
          })),
        });
      },
      onError: (error) => {
        console.error("[POST] Stream error:", error);
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (stream) {
      if (streamContext) {
        return new Response(
          await streamContext.resumableStream(streamId, () =>
            streamResponse.pipeThrough(new JsonToSseTransformStream()),
          ),
        );
      } else {
        return new Response(streamResponse.pipeThrough(new JsonToSseTransformStream()));
      }
    } else {
      // Handle non-streaming response
      const chunks: any[] = [];
      const reader = streamResponse.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        // Return the final response as JSON
        const finalMessage = chunks[chunks.length - 1];
        return Response.json(finalMessage);
      } finally {
        reader.releaseLock();
      }
    }
  } catch (error) {
    console.error('[POST] Unexpected error:', error);
    
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
