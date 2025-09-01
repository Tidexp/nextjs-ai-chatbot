import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
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

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const userType: UserType = session.user.type;
  const messageCount = await getMessageCountByUserId({
    id: session.user.id,
    differenceInHours: 24,
  });

  if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
    return new ChatSDKError('rate_limit:chat').toResponse();
  }

  // Giờ schema mới có `messages` array
  const { model, messages, temperature, max_completion_tokens, top_p, stream, stop } = requestBody;

  // Tạo chat mới (hoặc lấy chat cũ) - nếu muốn dùng chatId thì phải truyền thêm client
  const chatId = generateUUID(); // hoặc lấy từ DB nếu có
  await saveChat({
    id: chatId,
    userId: session.user.id,
    title: messages[0].content.slice(0, 50), // tự generate title từ message đầu
    visibility: 'private', // default, nếu không có selectedVisibilityType
  });

  // Lưu messages vào DB
  await saveMessages({
    messages: messages.map((msg) => ({
      chatId,
      id: generateUUID(),
      role: msg.role,
      parts: [{ type: 'text', text: msg.content }], // ép kiểu parts từ content string
      attachments: [],
      createdAt: new Date(),
    })),
  });

  // Chuẩn bị stream
  const uiMessages = convertToUIMessages(
    messages.map(msg => ({
      id: generateUUID(),
      chatId, // thêm chatId từ biến trước
      role: msg.role,
      parts: [{ type: 'text', text: msg.content }],
      attachments: [], // default rỗng
      createdAt: new Date(), // timestamp hiện tại
    }))
  );

  const streamId = generateUUID();
  await createStreamId({ streamId, chatId });

  const uiMessageStream = createUIMessageStream({
    execute: ({ writer: dataStream }) => {
      const result = streamText({
        model: myProvider.languageModel(model),
        system: systemPrompt({ selectedChatModel: model }),
        messages: convertToModelMessages(uiMessages),
      });
      result.consumeStream();
      dataStream.merge(result.toUIMessageStream());
    },
    generateId: generateUUID,
  });

  const streamContext = getStreamContext();
  if (streamContext) {
    return new Response(
      await streamContext.resumableStream(streamId, () =>
        uiMessageStream.pipeThrough(new JsonToSseTransformStream()),
      ),
    );
  } else {
    return new Response(uiMessageStream.pipeThrough(new JsonToSseTransformStream()));
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

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
