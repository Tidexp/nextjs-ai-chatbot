import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  createInstructorNote,
  deleteInstructorNote,
  getChatById,
  saveChat,
  listInstructorNotes,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

async function ensureInstructorChat(chatId: string, userId: string) {
  const chat = await getChatById({ id: chatId });
  if (chat && chat.userId === userId) return chat;
  await saveChat({
    id: chatId || generateUUID(),
    userId,
    title: 'Instructor Studio',
    visibility: 'private',
    chatType: 'instructor',
  });
  return getChatById({ id: chatId });
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

    const chat = await ensureInstructorChat(chatId, session.user.id);
    if (!chat || chat.userId !== session.user.id) {
      return new ChatSDKError('not_found:chat').toResponse();
    }

    const notes = await listInstructorNotes({
      chatId,
      userId: session.user.id,
    });
    return NextResponse.json({ notes });
  } catch (error) {
    console.error('[InstructorNotes][GET] error', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const body = await request.json();
    const { chatId, title, content } = body || {};

    if (!chatId || !title || !content) {
      return NextResponse.json(
        { error: 'chatId, title, and content are required' },
        { status: 400 },
      );
    }

    const chat = await ensureInstructorChat(chatId, session.user.id);
    if (!chat || chat.userId !== session.user.id) {
      return new ChatSDKError('not_found:chat').toResponse();
    }

    const note = await createInstructorNote({
      chatId,
      userId: session.user.id,
      title: String(title).trim(),
      content: String(content),
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('[InstructorNotes][POST] error', error);
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
    const noteId = searchParams.get('id');
    const chatId = searchParams.get('chatId');

    if (!noteId || !chatId) {
      return NextResponse.json(
        { error: 'id and chatId are required' },
        { status: 400 },
      );
    }

    const chat = await ensureInstructorChat(chatId, session.user.id);
    if (!chat || chat.userId !== session.user.id) {
      return new ChatSDKError('not_found:chat').toResponse();
    }

    await deleteInstructorNote({ id: noteId, userId: session.user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[InstructorNotes][DELETE] error', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}
