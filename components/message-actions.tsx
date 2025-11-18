import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';

import type { Vote } from '@/lib/db/schema';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon, PencilEditIcon } from './icons';
import { RotateCcw } from 'lucide-react';
import { Actions, Action } from './elements/actions';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/types';

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  onEdit,
  messages,
  setMessages,
  sendMessage,
  regenerate,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  onEdit?: () => void;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  sendMessage: (message: { role: 'user'; parts: any[] }) => void;
  regenerate: () => void;
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();

  if (isLoading) return null;

  return (
    <Actions className={message.role === 'user' ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-200' : ''}>
        <Action
          tooltip="Copy"
          onClick={async () => {
            const textFromParts = message.parts
              ?.filter((part) => part.type === 'text')
              .map((part) => part.text)
              .join('\n')
              .trim();

            if (!textFromParts) {
              toast.error("There's no text to copy!");
              return;
            }

            await copyToClipboard(textFromParts);
            toast.success('Copied to clipboard!');
          }}
        >
          <CopyIcon />
        </Action>

        {message.role === 'assistant' && (
          <Action
            tooltip="Try Again"
            onClick={async () => {
              // Custom regeneration for this specific message - works like edit button
              try {
                console.log('[MessageActions] Starting regeneration for message:', message.id);
                
                // Import deleteTrailingMessages
                const { deleteTrailingMessages } = await import('@/app/(chat)/actions');
                
                // Delete all messages from database after this message
                await deleteTrailingMessages({
                  id: message.id,
                });

                // Update local messages array to remove this assistant message and all messages after it
                setMessages((messages) => {
                  const index = messages.findIndex((m) => m.id === message.id);
                  
                  if (index !== -1) {
                    console.log('[MessageActions] Removing assistant message and messages after index:', index);
                    // Remove this assistant message and all messages after it
                    const updatedMessages = [...messages.slice(0, index)];
                    console.log('[MessageActions] Updated messages count:', updatedMessages.length);
                    return updatedMessages;
                  }
                  
                  console.log('[MessageActions] Message not found in current messages array');
                  return messages;
                });

                // Wait a bit for the state to update, then trigger regeneration
                setTimeout(() => {
                  console.log('[MessageActions] Calling regenerate...');
                  regenerate();
                }, 100);
                
                toast.success('Regenerating response...');
              } catch (error) {
                console.error('[MessageActions] Error regenerating message:', error);
                toast.error('Failed to regenerate response');
              }
            }}
          >
            <RotateCcw size={14} />
          </Action>
        )}

        {message.role === 'assistant' && (
          <Action
            tooltip="Upvote Response"
            data-testid="message-upvote"
          disabled={vote?.isUpvoted}
              onClick={async () => {
                const upvote = fetch('/api/vote', {
                  method: 'PATCH',
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    type: 'up',
                  }),
                });

                toast.promise(upvote, {
                  loading: 'Upvoting Response...',
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: true,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return 'Upvoted Response!';
                  },
                  error: 'Failed to upvote response.',
                });
              }}
        >
          <ThumbUpIcon />
        </Action>
        )}

        {message.role === 'assistant' && (
          <Action
            tooltip="Downvote Response"
            data-testid="message-downvote"
          disabled={vote && !vote.isUpvoted}
              onClick={async () => {
                const downvote = fetch('/api/vote', {
                  method: 'PATCH',
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    type: 'down',
                  }),
                });

                toast.promise(downvote, {
                  loading: 'Downvoting Response...',
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: false,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return 'Downvoted Response!';
                  },
                  error: 'Failed to downvote response.',
                });
              }}
        >
          <ThumbDownIcon />
        </Action>
        )}

        {message.role === 'user' && onEdit && (
          <Action
            tooltip="Edit Message"
            onClick={onEdit}
          >
            <PencilEditIcon />
          </Action>
        )}
    </Actions>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.onEdit !== nextProps.onEdit) return false;
    if (prevProps.messages.length !== nextProps.messages.length) return false;
    if (prevProps.setMessages !== nextProps.setMessages) return false;
    if (prevProps.sendMessage !== nextProps.sendMessage) return false;
    if (prevProps.regenerate !== nextProps.regenerate) return false;
    return true;
  },
);
