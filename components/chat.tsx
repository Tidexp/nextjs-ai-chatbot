'use client';

import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
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
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
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
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: async (input, init) => {
        const res = await fetchWithErrorHandlers(input, init);

        console.log('[Chat] Response received:', {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
          ok: res.ok,
        });

        return res;
      },
      prepareSendMessagesRequest({ messages, id, body }) {
        console.log('[Chat] Stream about to start');
        const mappedMessages = messages.map((m) => ({
          role: m.role,
          content: m.parts.length ? m.parts : [{ type: 'text', text: '' }],
        }));

        console.log('[Chat] Sending messages:', JSON.stringify(mappedMessages, null, 2));

        return {
          body: {
            model: initialChatModel,
            messages: mappedMessages,
            stream: true,
            ...body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      if (!streamStarted) {
        console.log('[Chat] Stream started');
        streamStarted = true;
      }
      console.log('[Chat] Received data part:', dataPart);
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: (message) => {
      console.log('[Chat] Stream finished:', message);
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      console.error('[Chat] Error:', error);
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
      console.log('[Chat] Sending query from URL:', query);
      sendMessage({
        role: 'user' as const,
        parts: [{ type: 'text', text: query }],
      });
      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  // Debug status changes
  useEffect(() => {
    console.log('[Chat] Status changed:', status);
  }, [status]);

  // Debug messages changes
  useEffect(() => {
    console.log('[Chat] Messages updated:', {
      count: messages.length,
      lastMessage: messages[messages.length - 1],
    });
  }, [messages]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  useAutoResume({ autoResume, initialMessages, resumeStream, setMessages });

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={initialChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
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
