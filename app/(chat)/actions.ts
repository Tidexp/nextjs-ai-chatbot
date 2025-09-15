'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
  updateChatTitleById,
} from '@/lib/db/queries';
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
  console.log('[generateTitleFromUserMessage] Received message:', JSON.stringify(message, null, 2));
  
  // Extract just the text content from the message
  const textContent = (message as any).parts?.find((part: any) => part.type === 'text')?.text || 
                     (message as any).content?.find((part: any) => part.type === 'text')?.text || 
                     '';

  console.log('[generateTitleFromUserMessage] Extracted text content:', textContent);

  if (!textContent.trim()) {
    console.log('[generateTitleFromUserMessage] No text content found, returning "New Chat"');
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
      return trimmedTitle.substring(0, 22) + '...';
    }
    
    return trimmedTitle || 'New Chat';
  } catch (error) {
    console.warn('[generateTitleFromUserMessage] Error generating title:', error);
    // Fallback to a simple truncation if AI fails
    return textContent.length > 25 
      ? textContent.substring(0, 22) + '...' 
      : textContent;
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const messages = await getMessageById({ id });
  
  if (!messages || messages.length === 0) {
    throw new ChatSDKError('not_found:database', 'Message not found');
  }
  
  const [message] = messages;

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
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
