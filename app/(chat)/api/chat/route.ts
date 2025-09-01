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
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
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
  return messages.map((msg) => ({
    id: generateUUID(),
    role: msg.role,
    content: msg.content.map((part) => {
      if (part.type === 'text') {
        return {
          type: 'text' as const,
          text: part.text,
        };
      } else {
        // For file parts, map to image format
        return {
          type: 'image' as const,
          image: part.url,
        };
      }
    }),
    createdAt: new Date().toISOString(),
  }));
}

// Helper function to extract chat ID from messages or generate new one
function extractOrGenerateChatId(messages: PostRequestBody['messages']): string {
  // Try to find chat ID in system message or generate new one
  const systemMessage = messages.find(msg => msg.role === 'system');
  // You might want to encode chat ID in system message or use a different strategy
  return generateUUID();
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
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

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;
    const userEntitlements = entitlementsByUserType[userType];

    // Validate the requested model exists
    const validModel = chatModels.find(model => model.id === requestedModel);
    if (!validModel) {
      return new ChatSDKError('bad_request:invalid_model').toResponse();
    }

    // Check if user can use the requested model
    if (!userEntitlements.availableChatModelIds.includes(requestedModel)) {
      return new ChatSDKError('forbidden:model').toResponse();
    }

    const selectedChatModel = requestedModel;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount >= userEntitlements.maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    // Extract or generate chat ID
    const chatId = extractOrGenerateChatId(messages);
    
    // Convert schema messages to UI messages
    const uiMessages = convertSchemaMessagesToUIMessages(messages);
    
    // Get the last user message for title generation
    const lastUserMessage = uiMessages.filter(msg => msg.role === 'user').pop() as ChatMessage | undefined;

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
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id: chatId });
    const existingUIMessages = convertToUIMessages(messagesFromDb);
    
    // Merge existing messages with new messages, avoiding duplicates
    const allUIMessages = [...existingUIMessages];
    
    // Only add new user messages that aren't already in the database
    const newUserMessages = uiMessages.filter(msg => 
      msg.role === 'user' && !existingUIMessages.some(existing => 
        existing.role === 'user' && 
        JSON.stringify(existing.content) === JSON.stringify(msg.content)
      )
    ) as ChatMessage[];

    allUIMessages.push(...newUserMessages);

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    // Save new user messages to database
    if (newUserMessages.length > 0) {
      await saveMessages({
        messages: newUserMessages.map((message) => ({
          chatId,
          id: message.id,
          role: 'user',
          parts: message.content || message.parts || [],
          attachments: [],
          createdAt: new Date(),
        })),
      });
    }

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId });

    const streamResponse = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        // Configure tools based on model capabilities
        const toolsConfig = selectedChatModel === 'meta-llama/llama-guard-4-12b' 
          ? {
              experimental_activeTools: [
                'getWeather',
                'createDocument', 
                'updateDocument',
                'requestSuggestions',
              ],
              tools: {
                getWeather,
                createDocument: createDocument({ session, dataStream }),
                updateDocument: updateDocument({ session, dataStream }),
                requestSuggestions: requestSuggestions({
                  session,
                  dataStream,
                }),
              },
            }
          : {
              experimental_activeTools: [],
              tools: {},
            };

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(allUIMessages),
          temperature,
          maxTokens: max_completion_tokens,
          topP: top_p,
          stopSequences: stop ? (Array.isArray(stop) ? stop : [stop]) : undefined,
          stopWhen: stepCountIs(5),
          ...toolsConfig,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
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
      onError: () => {
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
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    console.error('Unexpected error:', error);
    return new ChatSDKError('internal_server_error:chat').toResponse();
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
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
