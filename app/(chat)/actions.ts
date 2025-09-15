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
  // Extract just the text content from the message
  const textContent = (message as any).parts?.find((part: any) => part.type === 'text')?.text || 
                     (message as any).content?.find((part: any) => part.type === 'text')?.text || 
                     '';

  if (!textContent.trim()) {
    return 'New Chat';
  }

  const { text: title } = await generateText({
    model: myProvider.languageModel('gemini-2.5-flash'),
    system: `You are a title generator. Create a concise, descriptive title for a chat conversation based on the user's first message.

Rules:
- Maximum 50 characters
- Be specific and descriptive
- Use title case
- No quotes, colons, or special characters
- Focus on the main topic or request
- Examples:
  - "Write code to demonstrate Dijkstra's algorithm" → "Dijkstra's Algorithm Code"
  - "How do I create a React component?" → "React Component Help"
  - "Explain quantum computing basics" → "Quantum Computing Basics"`,
    prompt: textContent,
  });

  return title.trim();
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
