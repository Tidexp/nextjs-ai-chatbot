'use client';
import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState, useRef } from 'react';
import type { Vote } from '@/lib/db/schema';
import { DocumentToolResult } from './document';
import { SparklesIcon } from './icons';
import { Response } from './elements/response';
import { MessageContent } from './elements/message';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from './elements/tool';
import { EnhancedMessageActions } from './enhanced-message-actions';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import equal from 'fast-deep-equal';
import { cn, sanitizeText } from '@/lib/utils';
import { Button } from './ui/button';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from './document-preview';
import { MessageReasoning } from './message-reasoning';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import Image from 'next/image';
import { FilePreviewPanel } from './file-preview-panel';

// Type narrowing is handled by TypeScript's control flow analysis
// The AI SDK provides proper discriminated unions for tool calls

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
  messages,
  sendMessage,
  onStoreNote,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  messages: ChatMessage[];
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  onStoreNote?: (message: ChatMessage) => void;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    mediaType: string;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const attachmentsFromMessage: any[] = [];
  const messageId = message.id || `temp-${Date.now()}-${Math.random()}`;
  const stableId = useRef(messageId).current; // Use a stable ID that doesn't change on re-renders

  useDataStream();

  return (
    <AnimatePresence>
      <motion.div
        key={`motion-div-${stableId}`}
        data-testid={`message-${message.role}`}
        className="px-4 mx-auto w-full max-w-3xl group/message group"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn('flex w-full', {
            'gap-4': message.role === 'user' || mode === 'edit',
            'gap-3 items-start':
              message.role === 'assistant' && mode !== 'edit',
            'w-full': mode === 'edit',
            'group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:w-fit':
              mode !== 'edit' && message.role === 'user',
          })}
        >
          {message.role === 'assistant' && (
            <div className="flex justify-center items-center rounded-full ring-1 size-8 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div
            className={cn('flex flex-col w-full', {
              'gap-4': message.role === 'user',
              'gap-2': message.role === 'assistant',
              'min-h-96': message.role === 'assistant' && requiresScrollPadding,
            })}
          >
            {attachmentsFromMessage.length > 0 && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row gap-2 justify-end"
              >
                {attachmentsFromMessage.map((attachment) => {
                  const att = attachment as any;
                  return (
                    <PreviewAttachment
                      key={att.url || att.image}
                      attachment={{
                        name:
                          att.filename ??
                          (att.type === 'image' ? 'image' : 'file'),
                        contentType:
                          att.mediaType ||
                          (att.type === 'image'
                            ? 'image/png'
                            : 'application/octet-stream'),
                        url: att.url || att.image,
                      }}
                    />
                  );
                })}
              </div>
            )}

            {(() => {
              const hasUsableParts =
                Array.isArray(message.parts) &&
                message.parts.some(
                  (p: any) =>
                    p.type === 'text' && p.text && p.text.trim().length > 0,
                );
              if (!hasUsableParts && message.role === 'assistant') {
                const fallbackText = (message as any).text || '';
                if (fallbackText && fallbackText.trim().length > 0) {
                  return (
                    <div className="flex flex-row gap-2 items-start">
                      <MessageContent
                        data-testid="message-content"
                        className={cn('justify-start items-start text-left', {
                          'bg-transparent': true,
                        })}
                      >
                        <Response>{sanitizeText(fallbackText)}</Response>
                      </MessageContent>
                    </div>
                  );
                }
              }

              return (
                <div
                  key={`message-parts-${stableId}`}
                  className={cn('flex flex-col gap-2', {
                    'items-center': message.role === 'user',
                    'items-start': message.role === 'assistant',
                  })}
                >
                  {message.parts
                    ?.map((part, index) => {
                      const { type } = part;
                      const key = `message-${stableId}-part-${index}`;

                      if (
                        type === 'reasoning' &&
                        part.text?.trim().length > 0
                      ) {
                        return (
                          <MessageReasoning
                            key={key}
                            isLoading={isLoading}
                            reasoning={part.text}
                          />
                        );
                      }

                      if ((part as any).type === 'image') {
                        return (
                          <div key={key} className="max-w-xs group relative">
                            <button
                              type="button"
                              className="block cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setPreviewFile({
                                  url: (part as any).image,
                                  name: 'image',
                                  mediaType: 'image/png',
                                });
                                setIsPreviewOpen(true);
                              }}
                              aria-label="Open image preview"
                            >
                              <Image
                                src={(part as any).image}
                                alt="Uploaded image"
                                width={200}
                                height={200}
                                className="rounded-lg max-w-full h-auto"
                                style={{ maxHeight: '200px' }}
                              />
                            </button>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewFile({
                                    url: (part as any).image,
                                    name: 'image',
                                    mediaType: 'image/png',
                                  });
                                  setIsPreviewOpen(true);
                                }}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      if (part.type === 'file') {
                        const fileUrl = (part as any).file || (part as any).url;
                        const fileName = (part as any).name || 'file';
                        const mediaType =
                          (part as any).mediaType || 'application/octet-stream';

                        return (
                          <div key={key} className="max-w-xs group relative">
                            <button
                              type="button"
                              className="w-full text-left border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                              onClick={() => {
                                setPreviewFile({
                                  url: fileUrl,
                                  name: fileName,
                                  mediaType: mediaType,
                                });
                                setIsPreviewOpen(true);
                              }}
                              aria-label={`Open preview for ${fileName}`}
                            >
                              <div className="flex items-center gap-2">
                                {mediaType === 'text/plain' ? (
                                  <div className="size-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400 text-xs font-bold">
                                    📝
                                  </div>
                                ) : mediaType === 'application/pdf' ? (
                                  <div className="size-8 flex items-center justify-center bg-red-100 dark:bg-red-900/20 rounded text-red-600 dark:text-red-400 text-xs font-bold">
                                    📄
                                  </div>
                                ) : (
                                  <div className="size-8 flex items-center justify-center bg-gray-100 dark:bg-gray-900/20 rounded text-gray-600 dark:text-gray-400 text-xs font-bold">
                                    📁
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {fileName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {mediaType}
                                  </p>
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      }

                      if (type === 'text') {
                        if (mode === 'view') {
                          return (
                            <div key={key} className="w-full">
                              <MessageContent
                                data-testid="message-content"
                                className={cn({
                                  'justify-center items-center text-center bg-primary text-primary-foreground':
                                    message.role === 'user',
                                  'justify-start items-start text-left bg-transparent':
                                    message.role === 'assistant',
                                })}
                              >
                                <Response>{sanitizeText(part.text)}</Response>
                              </MessageContent>
                            </div>
                          );
                        }

                        if (mode === 'edit') {
                          return (
                            <div
                              key={key}
                              className="w-full flex flex-row gap-2 items-start"
                            >
                              <div className="size-8" />

                              <MessageEditor
                                key={`${stableId}-editor`}
                                message={message}
                                setMode={setMode}
                                setMessages={setMessages}
                                regenerate={regenerate}
                              />
                            </div>
                          );
                        }
                      }

                      if (type === 'tool-getWeather') {
                        const { toolCallId, state } = part;

                        return (
                          <Tool key={toolCallId} defaultOpen={true}>
                            <ToolHeader type="tool-getWeather" state={state} />
                            <ToolContent>
                              {state === 'input-available' && (
                                <ToolInput input={part.input} />
                              )}
                              {state === 'output-available' && (
                                <ToolOutput
                                  output={
                                    <Weather weatherAtLocation={part.output} />
                                  }
                                  errorText={undefined}
                                />
                              )}
                            </ToolContent>
                          </Tool>
                        );
                      }

                      if (type === 'tool-createDocument') {
                        const { toolCallId, state } = part;

                        return (
                          <Tool key={toolCallId} defaultOpen={true}>
                            <ToolHeader
                              type="tool-createDocument"
                              state={state}
                            />
                            <ToolContent>
                              {state === 'input-available' && (
                                <ToolInput input={part.input} />
                              )}
                              {state === 'output-available' && (
                                <ToolOutput
                                  output={
                                    'error' in part.output ? (
                                      <div className="p-2 text-red-500 rounded border">
                                        Error: {String(part.output.error)}
                                      </div>
                                    ) : (
                                      <DocumentPreview
                                        isReadonly={isReadonly}
                                        result={part.output}
                                      />
                                    )
                                  }
                                  errorText={undefined}
                                />
                              )}
                            </ToolContent>
                          </Tool>
                        );
                      }

                      if (type === 'tool-updateDocument') {
                        const { toolCallId, state } = part;

                        return (
                          <Tool key={toolCallId} defaultOpen={true}>
                            <ToolHeader
                              type="tool-updateDocument"
                              state={state}
                            />
                            <ToolContent>
                              {state === 'input-available' && (
                                <ToolInput input={part.input} />
                              )}
                              {state === 'output-available' && (
                                <ToolOutput
                                  output={
                                    'error' in part.output ? (
                                      <div className="p-2 text-red-500 rounded border">
                                        Error: {String(part.output.error)}
                                      </div>
                                    ) : (
                                      <DocumentToolResult
                                        type="update"
                                        result={part.output}
                                        isReadonly={isReadonly}
                                      />
                                    )
                                  }
                                  errorText={undefined}
                                />
                              )}
                            </ToolContent>
                          </Tool>
                        );
                      }

                      if (type === 'tool-requestSuggestions') {
                        const { toolCallId, state } = part;

                        return (
                          <Tool key={toolCallId} defaultOpen={true}>
                            <ToolHeader
                              type="tool-requestSuggestions"
                              state={state}
                            />
                            <ToolContent>
                              {state === 'input-available' && (
                                <ToolInput input={part.input} />
                              )}
                              {state === 'output-available' && (
                                <ToolOutput
                                  output={
                                    'error' in part.output ? (
                                      <div className="p-2 text-red-500 rounded border">
                                        Error: {String(part.output.error)}
                                      </div>
                                    ) : (
                                      <DocumentToolResult
                                        type="request-suggestions"
                                        result={part.output}
                                        isReadonly={isReadonly}
                                      />
                                    )
                                  }
                                  errorText={undefined}
                                />
                              )}
                            </ToolContent>
                          </Tool>
                        );
                      }

                      // Fallback for unknown part types
                      return null;
                    })
                    .filter(Boolean)}
                </div>
              );
            })()}

            {!isReadonly && (
              <EnhancedMessageActions
                key={`action-${stableId}`}
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
                onEdit={() => setMode('edit')}
                messages={messages}
                setMessages={setMessages}
                sendMessage={sendMessage}
                regenerate={regenerate}
                onStoreNote={onStoreNote}
              />
            )}
          </div>
        </div>
      </motion.div>

      <FilePreviewPanel
        key={`file-preview-${stableId}`}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        file={previewFile}
      />
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isReadonly !== nextProps.isReadonly) return false;
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.messages.length !== nextProps.messages.length) return false;
    if (prevProps.sendMessage !== nextProps.sendMessage) return false;
    if (prevProps.onStoreNote !== nextProps.onStoreNote) return false;

    return true; // Return true if props are equal (don't re-render)
  },
);

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="px-4 mx-auto w-full max-w-3xl group/message min-h-96"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          'flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
          {
            'group-data-[role=user]/message:bg-muted': true,
          },
        )}
      >
        <div className="flex justify-center items-center rounded-full ring-1 size-8 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            Hmm...
          </div>
        </div>
      </div>
    </motion.div>
  );
};
