import { auth, type UserType } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  getChatById,
  getChatsByUserId,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  getLessonContextByChatId,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import { myProvider, type GeminiModelId } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import { chatModels, DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { streamText } from 'ai';

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
function convertSchemaMessagesToUIMessages(
  messages: PostRequestBody['messages'],
): any[] {
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
          if (
            part.type === 'file' &&
            (part.mediaType === 'application/pdf' ||
              part.mediaType === 'text/plain')
          ) {
            // Convert PDF and text files to the 'file' part type
            const fileUrl = part.url || part.file;
            return {
              type: 'file' as const,
              file: fileUrl,
              mediaType: part.mediaType,
              name: part.name,
            };
          }
          // Any other part type (like non-image files) will be ignored
          return null;
        })
        .filter((p) => p !== null); // Remove null entries
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

  // Extract topic from URL query params
  const { searchParams } = new URL(request.url);
  const topicSlug = searchParams.get('topic') || undefined;

  try {
    const json = await request.json();
    console.log('[POST] Raw request body:', JSON.stringify(json, null, 2));

    // Parse with relaxed limits (schema no longer enforces 16k on every part)
    requestBody = postRequestBodySchema.parse(json);

    // Enforce 16k only on NEW user input parts; allow longer assistant/history parts
    for (const msg of requestBody.messages) {
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (
            part.type === 'text' &&
            typeof part.text === 'string' &&
            part.text.length > 16000
          ) {
            console.warn('[POST] User text exceeded 16000 chars, trimming');
            part.text = part.text.slice(0, 16000);
          }
        }
      }
    }

    // The AI SDK sends requests to /api/chat by default, not /api/chat/{id}
    // We need to extract the chat ID from the request body or use a different approach

    // For now, let's check if there's a chatId in the request body
    console.log('[POST] Request URL:', request.url);
    console.log('[POST] Request body chatId:', requestBody.chatId);

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
              type: 'text',
              text:
                typeof msg.content === 'string'
                  ? msg.content
                  : JSON.stringify(msg.content),
            },
          ],
        };
      }
      return msg;
    });
    console.log(
      '[POST] Parsed request body:',
      JSON.stringify(requestBody, null, 2),
    );
  } catch (error) {
    console.error('[POST] Error parsing request body:', error);
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
      chatType = 'general',
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
      console.warn('[POST] GEMINI_API_KEY is missing from environment!');
    } else {
      console.log('[POST] GEMINI_API_KEY is present.');
    }

    const session = await auth();

    if (!session?.user) {
      console.warn('[POST] No user session, unauthorized.');
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;
    const userEntitlements = entitlementsByUserType[userType];

    // Validate the requested model exists
    const validModel = chatModels.find((m) => m.id === model);
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
    console.log(
      `[POST] Message count for user ${session.user.id}: ${messageCount}`,
    );

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
        const firstUserMessage = messages.find((msg) => msg.role === 'user');
        if (firstUserMessage) {
          console.log(
            `[POST] Multiple messages detected, looking for existing chat`,
          );

          // Try to find a chat that has this first message
          // This is a simplified approach - in a real app you might want more sophisticated matching
          const userChats = await getChatsByUserId({
            id: session.user.id,
            limit: 10,
            startingAfter: null,
            endingBefore: null,
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

    // Quick validation: check if chat exists and user owns it
    const chat = await getChatById({ id: chatId });

    if (chat && chat.userId !== session.user.id) {
      console.warn(`[POST] Chat userId does not match session userId.`);
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    // Get existing messages to check for duplicates (fast query with index)
    const [existingMessages, convertedMessages] = await Promise.all([
      getMessagesByChatId({ id: chatId }),
      Promise.resolve(convertSchemaMessagesToUIMessages(messages)),
    ]);

    const existingMessageIds = new Set(
      existingMessages.map((m: { id: any }) => m.id),
    );
    const uiMessages = convertedMessages;

    console.log(
      `[POST] UI Messages from request:`,
      JSON.stringify(uiMessages, null, 2),
    );

    // For AI processing, use the messages from the request
    const messagesForAI = uiMessages;

    // Quick lesson context lookup (usually cached or fast)
    const lessonContext = await getLessonContextByChatId({ chatId });

    // Build system prompt with lesson context if available
    const topicSystemPrompt = systemPrompt({
      selectedChatModel: selectedChatModel || DEFAULT_CHAT_MODEL,
      topicSlug: lessonContext?.topicSlug || topicSlug,
      userLevel: 'beginner', // TODO: Get from UserTopicProgress table
      lessonContext: lessonContext
        ? {
            topicTitle: lessonContext.topicTitle,
            moduleTitle: lessonContext.moduleTitle,
            lessonTitle: lessonContext.lessonTitle,
            lessonType: lessonContext.lessonType,
            lessonContent: lessonContext.lessonContent?.substring(0, 500), // Limit content length for prompt
          }
        : undefined,
    });

    // Add system message at the beginning if topic/lesson is specified and no system message exists
    if (
      (topicSlug || lessonContext) &&
      !messagesForAI.some((msg) => msg.role === 'system')
    ) {
      messagesForAI.unshift({
        id: generateUUID(),
        role: 'system',
        parts: [{ type: 'text', text: topicSystemPrompt }],
        createdAt: new Date().toISOString(),
      } as any);
    } else if (
      (topicSlug || lessonContext) &&
      messagesForAI[0]?.role === 'system'
    ) {
      // Update existing system message with topic/lesson context
      (messagesForAI[0] as any).parts = [
        { type: 'text', text: topicSystemPrompt },
      ];
    }

    // Save chat and new messages (chat first due to foreign key)
    // Skip saving for instructor mode
    const isInstructorChatType = chatType === 'instructor';

    if (!isInstructorChatType) {
      const isNewChat = !chat;

      // Find NEW user messages that aren't in the database yet
      const newUserMessages = uiMessages.filter(
        (msg: any) => msg.role === 'user' && !existingMessageIds.has(msg.id),
      );

      // Save chat first if it's new (required for foreign key constraint)
      if (isNewChat) {
        console.log(`[POST] Creating new chat: ${chatId}`);
        await saveChat({
          id: chatId,
          userId: session.user.id,
          title: 'New Chat',
          visibility: 'private',
          chatType,
        });
      }

      // Now save messages (chat must exist first)
      if (newUserMessages.length > 0) {
        console.log(
          `[POST] Saving ${newUserMessages.length} new user messages`,
        );
        await saveMessages({
          messages: newUserMessages.map((msg: any) => ({
            chatId,
            id: msg.id,
            role: 'user',
            parts: msg.parts || [],
            attachments: [],
            createdAt: new Date(),
          })),
        });
      }
    } else {
      console.log('[POST] Skipping message storage for instructor mode');
    }

    // Use the custom provider directly for streaming
    // Include system message if topic is specified
    const systemMessage = messagesForAI.find((msg) => msg.role === 'system');
    const nonSystemMessages = messagesForAI.filter(
      (msg) => msg.role !== 'system',
    );

    // Log the system message for debugging
    if (systemMessage) {
      const systemText =
        (systemMessage as any).parts?.[0]?.text || topicSystemPrompt;
      console.log('[POST] System message extracted:');
      console.log(systemText);
      console.log('[POST] System message length:', systemText?.length);
    }

    const partsToText = (parts: any[]) => {
      // Flatten text parts into a single string; ignore non-text for chat completion
      const texts = parts
        .filter((p) => p?.type === 'text' && typeof p.text === 'string')
        .map((p) => p.text);
      return texts.join('\n\n');
    };

    const promptMessages = systemMessage
      ? [
          {
            role: 'system' as const,
            content:
              (systemMessage as any).parts?.[0]?.text || topicSystemPrompt,
          },
          ...nonSystemMessages.map((msg) => {
            const parts = (msg as any).parts || [];
            const contentText = parts.length > 0 ? partsToText(parts) : '';
            return {
              role: msg.role as 'user' | 'assistant',
              content: contentText,
            };
          }),
        ]
      : nonSystemMessages.map((msg) => {
          const parts = (msg as any).parts || [];
          const contentText = parts.length > 0 ? partsToText(parts) : '';
          return {
            role: msg.role as 'user' | 'assistant',
            content: contentText,
          };
        });

    // Standard Vercel AI SDK streamText() for proper SSE streaming
    // Use standard streamText() which works with useChat hook
    console.log('[POST] Starting streamText() for model:', selectedChatModel);
    console.log('[POST] Prompt messages being sent to model:');
    console.log(JSON.stringify(promptMessages, null, 2));

    const messageId = generateUUID();

    // For instructor chat, use very low temperature (0.1) to force strict adherence to instructions
    const isInstructorMode = isInstructorChatType;
    console.log('[POST] isInstructorMode:', isInstructorMode);
    console.log(
      '[POST] Setting temperature to:',
      isInstructorMode ? 0.1 : 'undefined',
    );

    const streamOptions: any = {
      model: myProvider.languageModel(selectedChatModel as GeminiModelId),
      messages: promptMessages as any,
      temperature: isInstructorMode ? 0.1 : undefined, // Very low temperature for strict fact extraction
    };

    console.log(
      '[POST] Stream options:',
      JSON.stringify(streamOptions, null, 2),
    );

    const result = streamText(streamOptions);

    console.log('[POST] Returning streaming response with text stream');

    // Create a pass-through stream that captures the text while streaming to client
    const encoder = new TextEncoder();
    let accumulatedText = '';

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        // chunk is already a string from textStream
        const text = typeof chunk === 'string' ? chunk : String(chunk);
        accumulatedText += text;

        // Encode to bytes for Response
        controller.enqueue(encoder.encode(text));
      },
      flush() {
        console.log('[POST] Transform stream flush called');
        // Skip saving assistant messages for instructor mode
        if (!isInstructorChatType) {
          // Save accumulated text when stream ends
          if (accumulatedText && accumulatedText.length > 0) {
            console.log('[POST] Stream finished, saving assistant message');
            // Use after() to ensure save completes even after response ends
            after(async () => {
              try {
                await saveMessages({
                  messages: [
                    {
                      id: messageId,
                      role: 'assistant',
                      parts: [{ type: 'text', text: accumulatedText }],
                      createdAt: new Date(),
                      attachments: [],
                      chatId,
                    },
                  ],
                });
                console.log('[POST] Assistant message saved:', messageId);
              } catch (saveError) {
                console.error(
                  '[POST] Failed to save assistant message:',
                  saveError,
                );
              }
            });
          }
        } else {
          console.log(
            '[POST] Skipping assistant message storage for instructor mode',
          );
        }
      },
    });

    // Pipe the text stream through our transform stream
    return new Response(result.textStream.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Message-Id': messageId,
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

// Force rebuild
