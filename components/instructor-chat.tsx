'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { ChatStatus } from 'ai';

import { chatModels, DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { instructorSystemPrompt } from '@/lib/ai/prompts';
import type { Attachment, ChatMessage } from '@/lib/types';
import { generateUUID } from '@/lib/utils';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';

interface InstructorChatProps {
  sources: Array<{ id: string; title: string; type: string; excerpt: string }>;
  enabledSourceIds: Set<string>;
  onStoreNote?: (message: ChatMessage) => void;
  chatId: string;
  onModelChange?: (model: string) => void;
}

export function InstructorChat({
  sources,
  enabledSourceIds,
  onStoreNote,
  chatId,
  onModelChange,
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
  const sourcesSyncedRef = useRef<Set<string>>(new Set());

  // Notify parent when model changes
  useEffect(() => {
    onModelChange?.(selectedModel);
  }, [selectedModel, onModelChange]);

  // Sync enabled sources with the chat in the database
  useEffect(() => {
    const syncSourcesToChat = async () => {
      const enabledIds = Array.from(enabledSourceIds);
      // Filter out temporary upload IDs (they start with "upload-")
      // Only sync real UUID sources that are saved to the database
      const validSourceIds = enabledIds.filter(
        (id) => !id.startsWith('upload-') && !sourcesSyncedRef.current.has(id),
      );

      if (validSourceIds.length === 0) return;

      try {
        for (const sourceId of validSourceIds) {
          try {
            await fetch('/api/instructor-chat-sources', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId, sourceId }),
            });
            sourcesSyncedRef.current.add(sourceId);
          } catch (err) {
            console.warn(`Failed to sync source ${sourceId}:`, err);
            // Continue with other sources if one fails
          }
        }
      } catch (error) {
        console.error('Failed to sync sources with chat:', error);
      }
    };

    syncSourcesToChat();
  }, [enabledSourceIds, chatId]);

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
          'You are a friendly, encouraging instructor in an interactive learning environment. Help students learn effectively with clear explanations and actionable guidance.';
        let formattedContext = '';
        // Fallback summary if RAG fails or returns no chunks
        const fallbackSourceSummary = enabledSources
          .map((s, i) => `${i + 1}. ${s.title} — ${s.excerpt || ''}`)
          .join('\n');
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
                similarityThreshold: 0.2, // more permissive to avoid zero hits
              }),
            });

            if (ragResponse.ok) {
              const ragData = await ragResponse.json();
              const { formattedContext: ctx, results } = ragData;
              formattedContext = ctx; // Store in outer scope

              console.log(
                `[InstructorChat] RAG found ${results?.length || 0} chunks`,
              );

              // Use the engaging instructor system prompt with source context
              systemContext = `${instructorSystemPrompt}

AVAILABLE TEACHING MATERIALS:
${enabledSources.map((s) => `📄 ${s.title}`).join('\n')}

When students ask questions, naturally reference and weave in relevant information from the materials when it's helpful.`;
            } else {
              systemContext = `${instructorSystemPrompt}

AVAILABLE TEACHING MATERIALS:
${enabledSources
  .map((s, i) => `${i + 1}. ${s.title} (${s.type}): ${s.excerpt}`)
  .join('\n')}

You have access to these materials to support your teaching.`;
            }
          } catch (error) {
            console.error('[InstructorChat] RAG search error:', error);
            systemContext = `${instructorSystemPrompt}

AVAILABLE TEACHING MATERIALS:
${sources
  .map((s, i) => `${i + 1}. ${s.title} (${s.type}): ${s.excerpt}`)
  .join('\n')}

Reference these materials to support your educational responses.`;
            formattedContext = fallbackSourceSummary;
          }
        } else {
          systemContext = `${instructorSystemPrompt}

No teaching materials are currently enabled. Provide helpful general guidance and, when relevant, suggest which materials to enable for more specific answers.`;
        }

        // Build messages with RAG context injected into the user message
        const messagesWithContext = messagesToSend.map((msg) => {
          const isCurrentUserMessage = msg.id === userMessage.id;
          const hasRagContext =
            formattedContext && formattedContext.trim().length > 0;

          if (isCurrentUserMessage) {
            const originalText = (msg as any).parts?.[0]?.text || '';

            if (hasRagContext) {
              // Inject RAG context when we have relevant chunks
              return {
                id: msg.id,
                role: msg.role,
                content: [
                  {
                    type: 'text',
                    text: `RELEVANT TEACHING MATERIALS (most relevant first):\n${formattedContext}\n\nSTUDENT QUESTION:\n${originalText}\n\nUse only the materials above; do not claim you lack access. If you need more, ask the student which source to use.`,
                  },
                ],
              };
            }

            // If we have sources but no relevant chunks, pass a summary so the model stays grounded
            if (enabledSources.length > 0) {
              const available = enabledSources
                .map((s, i) => `${i + 1}. ${s.title}`)
                .join('\n');

              const summaryBlock = fallbackSourceSummary
                ? `SOURCE SUMMARY:\n${fallbackSourceSummary}\n\n`
                : '';

              return {
                id: msg.id,
                role: msg.role,
                content: [
                  {
                    type: 'text',
                    text: `${summaryBlock}NO HIGH-CONFIDENCE CONTEXT FOUND FOR THIS QUESTION. AVAILABLE SOURCES:\n${available}\n\nSTUDENT QUESTION:\n${originalText}\n\nUse the sources above. If unsure, ask the student to pick a source or share a relevant excerpt. Do not claim you lack access.`,
                  },
                ],
              };
            }
          }
          return {
            id: msg.id,
            role: msg.role,
            content: (msg as any).parts || [],
          };
        });

        const requestPayload = {
          chatId,
          chatType: 'instructor',
          model: selectedModel,
          messages: [
            {
              id: generateUUID(),
              role: 'system',
              content: [{ type: 'text', text: systemContext }],
            },
            ...messagesWithContext,
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
    [enabledSourceIds, chatId, isLoading, selectedModel, sources],
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
            chatId={chatId}
            status={status}
            votes={[]}
            messages={messages}
            setMessages={setMessages}
            regenerate={async () => {}}
            isReadonly={false}
            isArtifactVisible={false}
            sendMessage={sendMessage}
            onStoreNote={onStoreNote}
          />
        )}
      </div>

      {/* Input area */}
      <div className="border-t p-4 bg-background">
        <MultimodalInput
          chatId={chatId}
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
