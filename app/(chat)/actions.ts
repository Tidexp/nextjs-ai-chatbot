'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import {
  deleteMessageById,
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
  updateChatTitleById,
  deleteChatById,
  deleteAllChatsByUserId,
  getChatById,
} from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';
import { ChatSDKError } from '@/lib/errors';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  console.log(
    '[generateTitleFromUserMessage] Received message:',
    JSON.stringify(message, null, 2),
  );

  // Extract just the text content from the message
  const textContent =
    (message as any).parts?.find((part: any) => part.type === 'text')?.text ||
    (message as any).content?.find((part: any) => part.type === 'text')?.text ||
    '';

  console.log(
    '[generateTitleFromUserMessage] Extracted text content:',
    textContent,
  );

  if (!textContent.trim()) {
    console.log(
      '[generateTitleFromUserMessage] No text content found, returning "New Chat"',
    );
    return 'New Chat';
  }

  // Use a simple, fast approach for title generation
  try {
    const { text: title } = await generateText({
      model: myProvider.languageModel('gemini-2.5-flash-lite'), // Use faster model
      system: `Summarize the following message into a short, descriptive chat title (max 25 characters). Use title case, no quotes or special characters.`,
      prompt: textContent,
      maxTokens: 10, // Limit response length for speed
      temperature: 0.3, // Lower temperature for more consistent results
    } as any); // Type assertion to bypass strict typing

    const trimmedTitle = title.trim();

    // Fallback: if title is still too long, truncate it
    if (trimmedTitle.length > 25) {
      return `${trimmedTitle.substring(0, 22)}...`;
    }

    return trimmedTitle || 'New Chat';
  } catch (error) {
    console.warn(
      '[generateTitleFromUserMessage] Error generating title:',
      error,
    );
    // Fallback to a simple truncation if AI fails
    return textContent.length > 25
      ? `${textContent.substring(0, 22)}...`
      : textContent;
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  try {
    const messages = await getMessageById({ id });

    if (!messages || messages.length === 0) {
      console.warn(
        `[deleteTrailingMessages] Message with id ${id} not found in database. This might be a streaming message that hasn't been saved yet.`,
      );
      // Don't throw an error - just log a warning and return
      // The frontend will handle the message deletion from the UI
      return;
    }

    const [message] = messages;

    // First delete the specific message being regenerated
    await deleteMessageById({ id });

    // Then delete all messages after this one (if any)
    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });
  } catch (error) {
    console.error(
      `[deleteTrailingMessages] Error deleting messages for id ${id}:`,
      error,
    );
    // Don't throw the error - let the frontend handle the UI update
    // This prevents the entire regeneration from failing due to database issues
  }
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

export async function updateChatTitle({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  await updateChatTitleById({ chatId, title });
}

export async function deleteChat({ chatId }: { chatId: string }) {
  const session = await auth();
  if (!session?.user) {
    throw new ChatSDKError('unauthorized:chat');
  }

  const chat = await getChatById({ id: chatId });
  if (!chat) {
    throw new ChatSDKError('bad_request:api', 'Chat not found');
  }

  if (chat.userId !== session.user.id) {
    throw new ChatSDKError('forbidden:chat');
  }

  return await deleteChatById({ id: chatId });
}

export async function deleteAllChats() {
  const session = await auth();
  if (!session?.user) {
    throw new ChatSDKError('unauthorized:chat');
  }

  return await deleteAllChatsByUserId({ userId: session.user.id });
}
