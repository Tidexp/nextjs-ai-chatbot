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
        console.log('[Chat] Response status:', res.status);
    
        // Nếu server trả JSON thay vì stream, fake stream
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          console.log('[Chat] Non-stream JSON:', json);

          // Build proper SSE events the AI SDK expects
          const encoder = new TextEncoder();
          const id = generateUUID();
          const text = Array.isArray(json.parts)
            ? (json.parts.find((p: any) => p.type === 'text')?.text ?? '')
            : (json.text || JSON.stringify(json));

          return new Response(
            new ReadableStream({
              start(controller) {
                const events = [
                  { type: 'text-start', id },
                  { type: 'text-delta', id, delta: text },
                  { type: 'text-end', id },
                ];
                for (const evt of events) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
                }
                controller.close();
              },
            }),
            {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
              },
            },
          );
        }
    
        // Nếu đã là stream, cứ để useChat lo
        return res;
      },
      prepareSendMessagesRequest({ messages, body }) {
        // Map helper
        const mapOne = (m: any) => ({
          role: m.role,
          content: (m.parts ?? []).filter(
            (p: any) => p.type !== 'text' || (p.text && p.text.trim().length)
          ),
        });

        // Find latest user and the most recent assistant before it
        const lastUserIndex = [...messages].map((m) => m.role).lastIndexOf('user');
        const lastAssistantIndex = lastUserIndex > 0
          ? [...messages]
              .slice(0, lastUserIndex)
              .map((m) => m.role)
              .lastIndexOf('assistant')
          : -1;

        const selected: any[] = [];
        if (lastAssistantIndex >= 0) selected.push(mapOne(messages[lastAssistantIndex]));
        if (lastUserIndex >= 0) selected.push(mapOne(messages[lastUserIndex]));

        // Fallback: if indices failed, at least send the last message
        if (selected.length === 0 && messages.length > 0) {
          selected.push(mapOne(messages[messages.length - 1]));
        }

        // System instruction to avoid re-answering earlier questions
        const systemInstruction = {
          role: 'system' as const,
          content: [
            {
              type: 'text' as const,
              text:
                'Answer only the most recent user message. Use any previous turns only as background context if helpful. Do not restate or re-answer earlier user questions unless explicitly asked.',
            },
          ],
        };

        const finalMessages = [systemInstruction, ...selected];

        return {
          body: {
            chatId: id,
            model: initialChatModel,
            messages: finalMessages,
            stream: false,
            ...body,
          },
        };
      },
    }),    
    onData: (dataPart) => {
      // Extract text robustly from various event shapes
      let text = '';
      try {
        if (typeof dataPart === 'string') {
          text = dataPart;
        } else if (dataPart && typeof dataPart === 'object') {
          const anyPart = dataPart as any;
          text = anyPart.textDelta || anyPart.delta || anyPart.text || '';
          if (!text && anyPart.type === 'message' && anyPart.message) {
            const parts = anyPart.message.parts || anyPart.message.content || [];
            text = (Array.isArray(parts) ? parts : [parts])
              .filter((p: any) => p && p.type === 'text' && p.text)
              .map((p: any) => p.text)
              .join('');
          }
        }
      } catch (_) {
        // ignore
      }

      if (!text || !text.trim()) return;

      // Debug: show incoming chunk size briefly
      console.debug('[Chat] chunk:', text.slice(0, 80));

      const uiTextPart = { type: 'text', text } as const;

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return [
            ...prev.slice(0, -1),
            { ...last, parts: [...last.parts, uiTextPart] },
          ];
        }
        return [
          ...prev,
          {
            id: generateUUID(),
            role: 'assistant',
            parts: [uiTextPart],
            createdAt: new Date().toISOString(),
            attachments: [],
          },
        ];
      });
    },    
    onFinish: ({ message }) => {
      // If we didn't stream any assistant chunks, append the final message
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const hasStreamedAssistant = last?.role === 'assistant' && (last.parts?.length ?? 0) > 0;
        if (hasStreamedAssistant) return prev;
        if (!message) return prev;

        // Normalize message to ensure 'parts' is present
        const anyMsg: any = message as any;
        const parts = anyMsg.parts || anyMsg.content || [];
        const normalized = {
          ...message,
          parts,
        } as typeof message;

        return [...prev, normalized];
      });
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


