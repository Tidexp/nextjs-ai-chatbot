import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  getChatById,
  linkSourceToChat,
  unlinkSourceFromChat,
  getChatSources,
} from '@/lib/db/queries';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const body = await request.json();
    const { chatId, sourceId } = body || {};

    if (!chatId || !sourceId) {
      return NextResponse.json(
        { error: 'chatId and sourceId are required' },
        { status: 400 },
      );
    }

    // Validate UUID format - reject temporary upload IDs and malformed UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatId) || !uuidRegex.test(sourceId)) {
      return NextResponse.json(
        { error: 'Invalid chatId or sourceId format' },
        { status: 400 },
      );
    }

    // Verify chat belongs to user
    const chat = await getChatById({ id: chatId });
    if (!chat || chat.userId !== session.user.id) {
      return new ChatSDKError('not_found:chat').toResponse();
    }

    // Link the source to the chat
    await linkSourceToChat({ chatId, sourceId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[InstructorChatSources][POST] error', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        { error: 'chatId is required' },
        { status: 400 },
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatId)) {
      return NextResponse.json(
        { error: 'Invalid chatId format' },
        { status: 400 },
      );
    }

    // Verify chat belongs to user
    const chat = await getChatById({ id: chatId });
    if (!chat || chat.userId !== session.user.id) {
      return new ChatSDKError('not_found:chat').toResponse();
    }

    // Get all sources linked to this chat
    const sources = await getChatSources({ chatId });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('[InstructorChatSources][GET] error', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const sourceId = searchParams.get('sourceId');

    if (!chatId || !sourceId) {
      return NextResponse.json(
        { error: 'chatId and sourceId are required' },
        { status: 400 },
      );
    }

    // Validate UUID format - reject temporary upload IDs and malformed UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatId) || !uuidRegex.test(sourceId)) {
      return NextResponse.json(
        { error: 'Invalid chatId or sourceId format' },
        { status: 400 },
      );
    }

    // Verify chat belongs to user
    const chat = await getChatById({ id: chatId });
    if (!chat || chat.userId !== session.user.id) {
      return new ChatSDKError('not_found:chat').toResponse();
    }

    // Unlink the source from the chat
    await unlinkSourceFromChat({ chatId, sourceId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[InstructorChatSources][DELETE] error', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}
