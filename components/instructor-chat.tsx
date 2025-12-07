'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { ChatStatus } from 'ai';

import { chatModels, DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { Attachment, ChatMessage } from '@/lib/types';
import { generateUUID } from '@/lib/utils';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';

interface InstructorChatProps {
  sources: Array<{ id: string; title: string; type: string; excerpt: string }>;
  enabledSourceIds: Set<string>;
}

export function InstructorChat({
  sources,
  enabledSourceIds,
}: InstructorChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [selectedModel, setSelectedModel] =
    useState<string>(DEFAULT_CHAT_MODEL);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const instructorChatId = useMemo(() => generateUUID(), []);

  const sendMessage = useCallback(
    async (message: any) => {
      if (isLoading) return;

      const userMessage: ChatMessage = {
        id: generateUUID(),
        role: 'user',
        parts: message.parts || [{ type: 'text', text: message.content }],
        createdAt: new Date().toISOString(),
      } as ChatMessage;

      let messagesToSend: ChatMessage[] = [];
      setMessages((prev) => {
        messagesToSend = [...prev, userMessage];
        return messagesToSend;
      });
      setStatus('submitted');
      setIsLoading(true);

      try {
        abortControllerRef.current = new AbortController();

        const enabledSources = sources.filter((s) =>
          enabledSourceIds.has(s.id),
        );

        let systemContext =
          'You are an AI instructor assistant helping with educational content.';
        let formattedContext = '';
        const isInstructorMode = true; // Instructor chat mode

        if (enabledSources.length > 0) {
          const sourceIds = enabledSources.map((s) => s.id);
          const userQuery = message.content || message.parts?.[0]?.text || '';

          try {
            const ragResponse = await fetch('/api/rag/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: userQuery,
                sourceIds,
                topK: 8,
                similarityThreshold: 0.2,
              }),
            });

            if (ragResponse.ok) {
              const ragData = await ragResponse.json();
              const { formattedContext: ctx, results } = ragData;
              formattedContext = ctx; // Store in outer scope

              console.log(
                `[InstructorChat] RAG found ${results?.length || 0} chunks`,
              );
              console.log(
                `[InstructorChat] Formatted context length: ${formattedContext?.length || 0} chars`,
              );
              console.log(
                '[InstructorChat] Raw results:',
                results?.map((r: any) => ({
                  relevance: r.relevance,
                  contentPreview: `${r.content?.substring(0, 100)}...`,
                })),
              );
              console.log(
                '[InstructorChat] Full formatted context:',
                formattedContext,
              );

              // CRITICAL: Make system prompt MANDATORY - user cannot override
              systemContext = `You are a DOCUMENT FACT EXTRACTOR. You have ONE job: extract exact facts from the document.

DOCUMENT:
${enabledSources.map((s) => `📄 ${s.title}`).join('\n')}

CONTENT TO EXTRACT FROM:
${formattedContext || 'NO CONTENT AVAILABLE'}

═══════════════════════════════════════════════════════════

YOUR JOB:
Read the user's question.
Search the CONTENT above for the answer.
Return ONLY what you find.

DO THIS:
✓ If fact is in CONTENT: Quote it exactly. Start with "Theo tài liệu:"
✓ If fact NOT in CONTENT: Say ONLY "Thông tin này không có trong tài liệu được cung cấp."
✓ Never explain. Never teach. Never give examples with different numbers.
✓ Never answer from general knowledge.
✓ Only use the CONTENT above.

FORBIDDEN:
✗ Don't explain concepts like "velocity is calculated by..."
✗ Don't give formulas
✗ Don't provide examples with other numbers
✗ Don't use general knowledge
✗ Don't say "I don't have access" (you have the CONTENT above)
✗ Don't teach or advise
ANSWER TEMPLATE:
If found: "Theo tài liệu test-content.md, [exact quote from CONTENT above]"
If not found: "Thông tin này không có trong tài liệu được cung cấp."

NOW: Read the user question and extract the fact. Use ONLY the CONTENT above.`;
            } else {
              systemContext = `You are an AI instructor assistant. The user has provided the following sources:\`n\`n${enabledSources
                .map((s, i) => `${i + 1}. ${s.title} (${s.type}): ${s.excerpt}`)
                .join(
                  '`n`n',
                )}\`n\`nUse these sources to provide informed, educational responses. Reference specific sources when relevant.`;
            }
          } catch {
            systemContext = `You are an AI instructor assistant. The user has provided the following sources:\`n\`n${sources
              .map((s, i) => `${i + 1}. ${s.title} (${s.type}): ${s.excerpt}`)
              .join(
                '`n`n',
              )}\`n\`nUse these sources to provide informed, educational responses. Reference specific sources when relevant.`;
          }
        }

        console.log('[InstructorChat] System context being sent to API:');
        console.log(systemContext);
        console.log('[InstructorChat] Full request payload:');
        const requestPayload = {
          chatId: instructorChatId,
          chatType: 'instructor',
          model: selectedModel,
          messages: [
            {
              id: generateUUID(),
              role: 'system',
              content: [{ type: 'text', text: systemContext }],
            },
            ...messagesToSend.map((msg, idx) => {
              // For instructor chat, prepend RAG context to the first user message
              if (isInstructorMode && msg.role === 'user' && idx === 0) {
                const userText = (msg as any).parts?.[0]?.text || '';
                return {
                  id: msg.id,
                  role: msg.role,
                  content: [
                    {
                      type: 'text',
                      text: `RETRIEVED CONTEXT:\n${formattedContext}\n\n---\n\nQUESTION: ${userText}\n\nRespond by extracting from the context above. Quote exactly.`,
                    },
                  ],
                };
              }
              return {
                id: msg.id,
                role: msg.role,
                content: (msg as any).parts || [],
              };
            }),
          ],
        };
        console.log(JSON.stringify(requestPayload, null, 2));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to get response: ${response.status}`);
        }

        const serverMessageId = response.headers.get('X-Message-Id');
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
            if (done) break;

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
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
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
        }
      } finally {
        setStatus('ready');
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [enabledSourceIds, instructorChatId, isLoading, selectedModel, sources],
  );

  const stop = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus('ready');
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Model selector - compact dropdown */}
      <div className="border-b px-3 py-2 bg-background flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Model:</span>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={isLoading}
          className="px-2 py-1 text-xs border rounded bg-background text-foreground disabled:opacity-50 cursor-pointer"
        >
          {chatModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-muted-foreground mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <h3 className="text-lg font-semibold mb-2">
                Instructor Mode Chat
              </h3>
              <p className="text-sm max-w-md">
                {sources.length > 0
                  ? `Start a conversation about your ${sources.length} source${sources.length > 1 ? 's' : ''}. Ask questions, request summaries, or explore concepts.`
                  : 'Add sources to get started. The AI will use them to provide informed educational responses.'}
              </p>
            </div>
          </div>
        ) : (
          <Messages
            chatId={instructorChatId}
            status={status}
            votes={[]}
            messages={messages}
            setMessages={setMessages}
            regenerate={async () => {}}
            isReadonly={false}
            isArtifactVisible={false}
            sendMessage={sendMessage}
          />
        )}
      </div>

      {/* Input area */}
      <div className="border-t p-4 bg-background">
        <MultimodalInput
          chatId={instructorChatId}
          input={input}
          setInput={setInput}
          status={status}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          messages={messages}
          setMessages={setMessages}
          sendMessage={sendMessage}
          selectedVisibilityType="private"
          chatType="instructor"
        />
      </div>
    </div>
  );
}
