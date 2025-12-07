import { PreviewMessage, ThinkingMessage } from './message';
import { Greeting } from './greeting';
import type { Vote } from '@/lib/db/schema';
import type { UseChatHelpers } from '@ai-sdk/react';
import { motion } from 'framer-motion';
import { useMessages } from '@/hooks/use-messages';
import type { ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from './elements/conversation';

interface MessagesProps {
  chatId: string;
  status: UseChatHelpers<ChatMessage>['status'];
  votes: Array<Vote> | undefined;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  onStoreNote?: (message: ChatMessage) => void;
}

function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  sendMessage,
  onStoreNote,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({
    chatId,
    status,
  });

  useDataStream();

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
      <Conversation className="flex flex-col min-w-0 gap-6 pt-4 pb-32">
        <ConversationContent className="flex flex-col gap-6">
          {messages.length === 0 && <Greeting />}

          {messages.map((message, index) => {
            // Create a stable key that doesn't change on re-renders
            const messageKey = message.id
              ? `${message.id}-${index}`
              : `temp-message-${index}`;

            return (
              <PreviewMessage
                key={messageKey}
                chatId={chatId}
                message={message}
                isLoading={
                  status === 'streaming' && messages.length - 1 === index
                }
                vote={
                  votes
                    ? votes.find((vote) => vote.messageId === message.id)
                    : undefined
                }
                setMessages={setMessages}
                regenerate={regenerate}
                isReadonly={isReadonly}
                requiresScrollPadding={
                  hasSentMessage && index === messages.length - 1
                }
                messages={messages}
                sendMessage={sendMessage}
                onStoreNote={onStoreNote}
              />
            );
          })}

          {status === 'submitted' &&
            messages.length > 0 &&
            messages[messages.length - 1].role === 'user' && (
              <ThinkingMessage />
            )}

          <motion.div
            ref={messagesEndRef}
            className="shrink-0 min-w-[24px] min-h-[24px]"
            onViewportLeave={onViewportLeave}
            onViewportEnter={onViewportEnter}
          />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}

export const Messages = PureMessages;
