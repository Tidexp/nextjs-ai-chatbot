'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import useSWR, { useSWRConfig, unstable_serialize } from 'swr';
import type { ChatStatus } from 'ai';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import type { ChatMessage } from '@/lib/types';

interface ChatProps {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel?: string;
  initialVisibilityType?: VisibilityType;
  isReadonly?: boolean;
  session: Session;
  initialTitle?: string;
  query?: string;
  compact?: boolean;
}

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly = false,
  session,
  initialTitle,
  query,
  compact = false,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);
  const [visibilityType, setVisibilityType] = useState<VisibilityType>(
    initialVisibilityType || 'private',
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const { mutate } = useSWRConfig();
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Sync messages with initialMessages when they change (e.g., on page reload)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);
  const sendMessage = useCallback(
    async (message: any) => {
      if (isLoading) return;

      console.log('[Chat] Sending message:', message);

      const userMessage: ChatMessage = {
        id: generateUUID(),
        role: 'user',
        parts: message.parts || [{ type: 'text', text: message.content }],
        createdAt: new Date().toISOString(),
      } as ChatMessage;

      // Add user message to UI
      let messagesToSend: ChatMessage[] = [];
      setMessages((prev) => {
        messagesToSend = [...prev, userMessage];
        return messagesToSend;
      });
      setStatus('submitted');
      setIsLoading(true);

      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: id,
            messages: messagesToSend.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: (msg as any).parts || [],
            })),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Chat] API error:', errorText);
          throw new Error(`Failed to get response: ${response.status}`);
        }

        // Get the message ID from server response headers
        const serverMessageId = response.headers.get('X-Message-Id');
        console.log('[Chat] Server message ID:', serverMessageId);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantText = '';

        const assistantMessage: ChatMessage = {
          id: serverMessageId || generateUUID(),
          role: 'assistant',
          parts: [{ type: 'text', text: '' }],
          createdAt: new Date().toISOString(),
        } as ChatMessage;

        setStatus('streaming');
        setMessages((prev) => [...prev, assistantMessage]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('[Chat] Stream completed');
              break;
            }

            const chunk = decoder.decode(value, { stream: true });

            if (chunk) {
              assistantText += chunk;

              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  (lastMsg as any).parts = [
                    { type: 'text', text: assistantText },
                  ];
                }
                return updated;
              });
            }
          }
        }

        console.log('[Chat] Finished reading stream, refreshing sidebar');
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        try {
          window.dispatchEvent(new Event('chatCreated'));
        } catch {}
      } catch (error: any) {
        console.error('[Chat] Error:', error);

        if (error.name === 'AbortError') {
          return; // User cancelled, ignore
        }

        const errorMessage: ChatMessage = {
          id: generateUUID(),
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'Sorry, I encountered an error. Please try again.',
            },
          ],
          createdAt: new Date().toISOString(),
        } as ChatMessage;

        setMessages((prev) => [...prev, errorMessage]);

        toast({
          type: 'error',
          description: error?.message || 'An error occurred',
        });
      } finally {
        setStatus('ready');
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [isLoading, id, mutate, messages],
  );

  const stop = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus('ready');
      setIsLoading(false);
    }
  }, []);

  const regenerate = useCallback(
    async ({ messageId: assistantMessageId }: { messageId?: string } = {}) => {
      if (isLoading) return;

      // Determine which assistant message to regenerate.
      // If none supplied, fall back to latest assistant message.
      let targetAssistantIndex = -1;
      if (assistantMessageId) {
        targetAssistantIndex = messages.findIndex(
          (m) => m.id === assistantMessageId && m.role === 'assistant',
        );
      } else {
        // Find last assistant
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'assistant') {
            targetAssistantIndex = i;
            break;
          }
        }
      }

      if (targetAssistantIndex === -1) return;

      // Find the preceding user message for context
      let precedingUserIndex = -1;
      for (let i = targetAssistantIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          precedingUserIndex = i;
          break;
        }
      }
      if (precedingUserIndex === -1) return;

      const userMessage = messages[precedingUserIndex];

      // Keep all messages up to and including the triggering user message.
      const baseMessages = messages.slice(0, precedingUserIndex + 1);
      setMessages(baseMessages); // remove assistant + trailing messages

      // Start streaming a new assistant response WITHOUT duplicating the user message.
      setStatus('submitted');
      setIsLoading(true);

      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: id,
            messages: baseMessages.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: (msg as any).parts || [],
            })),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Chat][regenerate] API error:', errorText);
          throw new Error(`Failed to regenerate: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantText = '';

        const assistantMessage: ChatMessage = {
          id: generateUUID(),
          role: 'assistant',
          parts: [{ type: 'text', text: '' }],
          createdAt: new Date().toISOString(),
        } as ChatMessage;

        setStatus('streaming');
        setMessages((prev) => [...prev, assistantMessage]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('[Chat][regenerate] Stream completed');
              break;
            }
            const chunk = decoder.decode(value, { stream: true });
            if (chunk) {
              assistantText += chunk;
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  (lastMsg as any).parts = [
                    { type: 'text', text: assistantText },
                  ];
                }
                return updated;
              });
            }
          }
        }

        mutate(unstable_serialize(getChatHistoryPaginationKey));
      } catch (error: any) {
        console.error('[Chat][regenerate] Error:', error);
        if (error.name === 'AbortError') return;
        const errorMessage: ChatMessage = {
          id: generateUUID(),
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'Sorry, regeneration failed. Please try again.',
            },
          ],
          createdAt: new Date().toISOString(),
        } as ChatMessage;
        setMessages((prev) => [...prev, errorMessage]);
        toast({
          type: 'error',
          description: error?.message || 'Regeneration failed',
        });
      } finally {
        setStatus('ready');
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, isLoading, id, mutate],
  );

  // Send query from URL once
  useEffect(() => {
    if (query && !hasAppendedQuery) {
      console.log('[Chat] Sending message from URL query');
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: query }],
      });
      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const hasAssistantMessage = messages.some(
    (m: ChatMessage) => m.role === 'assistant',
  );
  const { data: votes } = useSWR<Vote[]>(
    hasAssistantMessage ? `/api/vote?chatId=${id}` : null,
    fetcher,
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    },
  );

  return (
    <>
      <div
        className={
          compact
            ? 'flex flex-col min-w-0 h-dvh bg-background'
            : 'flex flex-col min-w-0 h-dvh bg-background'
        }
      >
        {!compact && (
          <ChatHeader
            chatId={id}
            selectedModelId={initialChatModel || ''}
            selectedVisibilityType={initialVisibilityType || 'private'}
            isReadonly={isReadonly}
            session={session}
            title={initialTitle}
          />
        )}

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
          sendMessage={sendMessage}
          // When compact, the Messages component will still render but
          // we can reduce surrounding paddings via parent styling
        />

        <div
          className={
            compact
              ? 'sticky bottom-0 flex gap-2 px-3 pb-3 mx-auto w-full bg-background z-[1] border-t-0'
              : 'sticky bottom-0 flex gap-2 px-4 pb-4 mx-auto w-full bg-background md:pb-6 md:max-w-3xl z-[1] border-t-0'
          }
        >
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={visibilityType}
            />
          )}
        </div>
      </div>

      {!compact && (
        <Artifact
          chatId={id}
          input={input}
          setInput={setInput}
          status={status}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          sendMessage={sendMessage}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          votes={votes}
          isReadonly={isReadonly}
          selectedVisibilityType={visibilityType}
        />
      )}
    </>
  );
}
