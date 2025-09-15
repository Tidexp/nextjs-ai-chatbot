'use client';

import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState, useCallback } from 'react';
import useSWR, { useSWRConfig, unstable_serialize } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
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
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
  initialTitle?: string;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const searchParams = useSearchParams();
  const query = searchParams.get('query');
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  let streamStarted = false;

  // Utility function to deduplicate messages
  const deduplicateMessages = useCallback((messages: ChatMessage[]): ChatMessage[] => {
    const seen = new Set<string>();
    const deduplicated = messages.filter(msg => {
      if (!msg.id || seen.has(msg.id)) {
        return false;
      }
      seen.add(msg.id);
      return true;
    });
    
    return deduplicated;
  }, []);

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
    generateId: generateUUID,
    onData: (data) => {
      console.log('[Chat] ===== SSE DATA RECEIVED =====');
      console.log('[Chat] Data:', data);
      console.log('[Chat] Type:', typeof data);
      console.log('[Chat] Keys:', Object.keys(data || {}));
      console.log('[Chat] =============================');
    },
    onToolCall: (toolCall) => {
      console.log('[Chat] ===== TOOL CALL RECEIVED =====');
      console.log('[Chat] Tool Call:', toolCall);
      console.log('[Chat] ==============================');
    },
    onFinish: ({ message }) => {
      console.log('[Chat] ===== SSE STREAM FINISHED =====');
      console.log('[Chat] Message:', message);
      console.log('[Chat] ===============================');
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      console.error('[Chat] SSE Error:', error);
      if (error instanceof ChatSDKError) {
        toast({ type: 'error', description: error.message });
      } else {
        toast({ type: 'error', description: 'An unexpected error occurred' });
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
  const debugSendMessage = useCallback((message: any) => {
    console.log('[Chat] ===== SENDMESSAGE CALLED =====');
    console.log('[Chat] Message:', message);
    console.log('[Chat] Status before:', status);
    console.log('[Chat] ===============================');
    return sendMessage(message);
  }, [sendMessage, status]);



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
      setLastMessageCount(messages.length);
      
      // Check for duplicates and clean them up
      const duplicates = messages.filter((msg, index) => 
        messages.findIndex(m => m.id === msg.id) !== index
      );
      
      if (duplicates.length > 0) {
        const deduplicated = deduplicateMessages(messages);
        setMessages(deduplicated);
      }
    }
  }, [messages.length, lastMessageCount, messages, setMessages, deduplicateMessages]);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={initialChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
          title={initialTitle}
        />

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
        />

        <div className="sticky bottom-0 flex gap-2 px-4 pb-4 mx-auto w-full bg-background md:pb-6 md:max-w-3xl z-[1] border-t-0">
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

        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white text-xs rounded max-w-sm">
            <div>Status: {status}</div>
            <div>Messages: {messages.length}</div>
            <div>Chat ID: {id}</div>
            <div>Model: {initialChatModel}</div>
          </div>
        )}
      </div>

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
    </>
  );
}


