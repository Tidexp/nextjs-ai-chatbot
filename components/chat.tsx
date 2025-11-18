'use client';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState, useCallback } from 'react';
import useSWR, { useSWRConfig, unstable_serialize } from 'swr';
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
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import type { Attachment, ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
  initialTitle,
  compact = false,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
  initialTitle?: string;
  compact?: boolean;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  // Dev-only debug stream to visibly show incoming deltas immediately
  const [debugStream, setDebugStream] = useState<string>('');
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const searchParams = useSearchParams();
  const query = searchParams.get('query');
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  const streamStarted = false;

  // Utility function to deduplicate messages
  const deduplicateMessages = useCallback(
    (messages: ChatMessage[]): ChatMessage[] => {
      const seen = new Set<string>();
      const deduplicated: ChatMessage[] = [];

      for (const msg of messages) {
        if (!msg.id || seen.has(msg.id)) {
          console.log('[Chat] Skipping duplicate message:', msg.id);
          continue;
        }

        // Also check for content-based duplicates to handle cases where IDs might be different
        const contentKey = `${msg.role}-${JSON.stringify(msg.parts)}`;
        if (seen.has(contentKey)) {
          console.log('[Chat] Skipping duplicate content:', contentKey);
          continue;
        }

        seen.add(msg.id);
        seen.add(contentKey);
        deduplicated.push(msg);
      }

      console.log(
        '[Chat] Deduplicated messages:',
        deduplicated.length,
        'from',
        messages.length,
      );
      return deduplicated;
    },
    [],
  );

  console.log('[Chat] ===== RENDERING CHAT COMPONENT =====');
  console.log('[Chat] Initial messages:', initialMessages.length);
  console.log('[Chat] Chat ID:', id);
  console.log('[Chat] ====================================');

  // Test if console.log is working
  console.log('TEST: Console logging is working');

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 0, // Disable throttling for immediate streaming
    generateId: () => generateUUID(), // Generate new IDs only for new messages
    onData: (data) => {
      console.log('[Chat] ===== SSE DATA RECEIVED =====');
      console.log('[Chat] Data:', data);
      console.log('[Chat] Type:', typeof data);
      console.log('[Chat] Keys:', Object.keys(data || {}));
      console.log('[Chat] Raw data string:', JSON.stringify(data));
      console.log('[Chat] Data type:', data?.type);
      console.log('[Chat] Data text:', (data as any)?.text);
      console.log('[Chat] Data delta:', (data as any)?.delta);
      console.log('[Chat] Data id:', (data as any)?.id);
      console.log('[Chat] =============================');

      if (data && typeof data === 'object') {
        const messageId = (data as any).id;
        const type = (data as any).type;

        if (type === 'text-start' && messageId) {
          // Create new assistant message with server-provided messageId
          console.log('[Chat] Processing text-start:', { messageId });
          setMessages((prev) => {
            // Check if message already exists (avoid duplicates)
            const existingMessage = prev.find((msg) => msg.id === messageId);
            if (existingMessage) {
              return prev;
            }

            return [
              ...prev,
              {
                id: messageId,
                role: 'assistant',
                parts: [{ type: 'text', text: '' }],
                createdAt: new Date().toISOString(),
              },
            ];
          });
        }

        if (type === 'text-delta' && messageId) {
          const delta = (data as any).delta;
          if (delta) {
            console.log('[Chat] Processing text-delta:', {
              messageId,
              delta: `${delta.slice(0, 50)}...`,
            });
            // Append to a short-lived debug buffer so we can see streaming in the UI
            try {
              setDebugStream((s) => (s + delta).slice(-2000));
            } catch {}
            setMessages((prev) => {
              let found = false;
              const updated = prev.map((msg) => {
                if (msg.id === messageId && msg.role === 'assistant') {
                  found = true;
                  // Find existing text part and append delta
                  const textPart = msg.parts?.find(
                    (p: any) => p.type === 'text',
                  );
                  const currentText = textPart
                    ? (textPart as any).text || ''
                    : '';
                  const newText = currentText + delta;

                  return {
                    ...msg,
                    parts: [{ type: 'text', text: newText }],
                  };
                }
                return msg;
              });

              if (found) return updated;

              // If no existing assistant message with this id, append one so partial deltas are visible
              return [
                ...prev,
                {
                  id: messageId,
                  role: 'assistant',
                  parts: [{ type: 'text', text: delta }],
                  createdAt: new Date().toISOString(),
                } as any,
              ];
            });
          }
        }

        if (type === 'text-end' && messageId) {
          console.log('[Chat] Processing text-end:', { messageId });
          // Message is complete, no additional action needed
          // The message already has all the accumulated text
        }
      }
    },
    onToolCall: (toolCall) => {
      console.log('[Chat] ===== TOOL CALL RECEIVED =====');
      console.log('[Chat] Tool Call:', toolCall);
      console.log('[Chat] ==============================');
    },
    onFinish: ({ message }) => {
      console.log('[Chat] ===== SSE STREAM FINISHED =====');
      console.log('[Chat] Message:', message);
      console.log('[Chat] Message parts:', message.parts);
      console.log('[Chat] Message keys:', Object.keys(message));
      console.log(
        '[Chat] Message content (if exists):',
        (message as any).content,
      );
      console.log('[Chat] ===============================');
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      // Dispatch an event so the sidebar refreshes immediately on first message
      try {
        window.dispatchEvent(new Event('chatCreated'));
      } catch {}
    },
    onError: (error) => {
      console.error('[Chat] SSE Error:', error);
      console.error('[Chat] Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });

      if (error instanceof ChatSDKError) {
        toast({ type: 'error', description: error.message });
      } else if (error?.message?.includes('Failed to fetch')) {
        toast({
          type: 'error',
          description:
            'Connection failed. The AI service may be temporarily unavailable. Please try again.',
        });
      } else if (error?.message?.includes('503')) {
        toast({
          type: 'error',
          description:
            'AI service is overloaded. Please try again in a moment.',
        });
      } else {
        toast({
          type: 'error',
          description: `An error occurred: ${error?.message || 'Unknown error'}`,
        });
      }
    },
  });

  // Send query from URL once
  useEffect(() => {
    if (query && !hasAppendedQuery) {
      console.log('[Chat] ===== SENDING MESSAGE FROM URL =====');
      console.log('[Chat] Query:', query);
      console.log('[Chat] =====================================');
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: query }],
      });
      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  // Debug sendMessage function
  const debugSendMessage = useCallback(
    (message: any) => {
      console.log('[Chat] ===== SENDMESSAGE CALLED =====');
      console.log('[Chat] Message:', message);
      console.log('[Chat] Status before:', status);
      console.log('[Chat] ===============================');
      return sendMessage(message);
    },
    [sendMessage, status],
  );

  // Debug status changes
  useEffect(() => {
    console.log('[Chat] ===== STATUS CHANGED =====');
    console.log('[Chat] Status:', status);
    console.log('[Chat] Messages count:', messages.length);
    console.log('[Chat] ==========================');
  }, [status, messages.length]);

  const hasAssistantMessage = messages.some((m) => m.role === 'assistant');
  const { data: votes } = useSWR<Vote[]>(
    hasAssistantMessage ? `/api/vote?chatId=${id}` : null,
    fetcher,
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    },
  );

  useAutoResume({ autoResume, initialMessages, resumeStream, setMessages });

  // Clean up duplicates when messages change (but avoid infinite loops)
  const [lastMessageCount, setLastMessageCount] = useState(messages.length);
  useEffect(() => {
    if (messages.length !== lastMessageCount) {
      console.log(
        '[Chat] Message count changed from',
        lastMessageCount,
        'to',
        messages.length,
      );
      setLastMessageCount(messages.length);

      // Check for duplicates and clean them up
      const duplicates = messages.filter(
        (msg, index) => messages.findIndex((m) => m.id === msg.id) !== index,
      );

      if (duplicates.length > 0) {
        console.log(
          '[Chat] Found',
          duplicates.length,
          'duplicate messages, deduplicating...',
        );
        const deduplicated = deduplicateMessages(messages);
        setMessages(deduplicated);
      }
    }
  }, [
    messages.length,
    lastMessageCount,
    messages,
    setMessages,
    deduplicateMessages,
  ]);

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
            selectedModelId={initialChatModel}
            selectedVisibilityType={initialVisibilityType}
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

      {/* Dev-only streaming debug overlay (shows last ~2000 chars of received deltas) */}
      <div
        aria-hidden
        className="fixed left-4 bottom-28 z-[60] pointer-events-none"
      >
        <div className="max-w-md p-2 rounded bg-black/60 text-xs text-white font-mono whitespace-pre-wrap">
          {debugStream}
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
