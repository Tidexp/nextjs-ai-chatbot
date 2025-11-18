'use client';

import { useState, useCallback, useEffect } from 'react';
import { CodeEditor } from '@/components/code-editor';
import { CodePreview } from '@/components/code-preview';
import { LessonChat } from '@/components/lesson-chat';
import { PlaygroundChat } from '@/components/playground-chat';
import { Button } from '@/components/ui/button';
import { PlayIcon, SparklesIcon, ChevronLeftIcon } from './icons';
import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';

interface CodePlaygroundProps {
  initialCode: string;
  language: 'html' | 'css' | 'javascript';
  lessonId?: string;
  userId: string;
  session?: Session | null;
}

export function CodePlayground({
  initialCode,
  language,
  lessonId,
  userId,
  session,
}: CodePlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [showPreview, setShowPreview] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(50);
  const [chatWidth, setChatWidth] = useState(40);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [chatInitialMessages, setChatInitialMessages] = useState<any[]>([]);
  const [chatKey, setChatKey] = useState(0); // Force remount chat when messages change
  const router = useRouter();

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const handleRunCode = useCallback(() => {
    setShowPreview(true);
  }, []);

  const handleCheckWithAI = useCallback(async () => {
    // Toggle: if chat is open, close it (conversation preserved in state)
    if (showChat) {
      setShowChat(false);
      return;
    }

    // Reopen: if chat has messages, just show it again
    if (chatInitialMessages.length > 0) {
      setShowChat(true);
      return;
    }

    // New conversation: validate code or show prompt
    if (!code.trim()) {
      const now = new Date().toISOString();
      setChatInitialMessages([
        {
          id: 'prompt-1',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'Please write some code first, and I can help you check it! Or feel free to ask me any coding questions.',
            },
          ],
          createdAt: now,
        },
      ]);
      setChatKey((prev) => prev + 1); // Force remount with new messages
      setShowChat(true);
      return;
    }

    // Check code and open chat with feedback as first message (new conversation)
    try {
      const response = await fetch('/api/code-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          lessonId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check code');
      }

      const result = await response.json();

      const message = result.isValid
        ? `✅ **Great job!** Your code looks good!\n\n${result.message}\n\nFeel free to ask me any questions or request improvements.`
        : `⚠️ **Your code needs some improvements:**\n\n${result.message}\n\nLet me know if you need help fixing these issues!`;

      const now = new Date().toISOString();
      setChatInitialMessages([
        {
          id: 'feedback-1',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: message,
            },
          ],
          createdAt: now,
        },
      ]);
      setChatKey((prev) => prev + 1); // Force remount with new messages
      setShowChat(true);
    } catch (error) {
      console.error('Error checking code:', error);
      const now = new Date().toISOString();
      setChatInitialMessages([
        {
          id: 'error-1',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'Failed to check code. But I can still help you! What would you like to know?',
            },
          ],
          createdAt: now,
        },
      ]);
      setChatKey((prev) => prev + 1); // Force remount with new messages
      setShowChat(true);
    }
  }, [code, language, lessonId, showChat, chatInitialMessages.length]);

  const handlePreviewMouseDown = useCallback(() => {
    setIsResizingPreview(true);
  }, []);

  useEffect(() => {
    if (!isResizingPreview) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('playground-container');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      if (newWidth >= 20 && newWidth <= 80) {
        setPreviewWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingPreview(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingPreview]);

  const handleChatMouseDown = useCallback(() => {
    setIsResizingChat(true);
  }, []);

  useEffect(() => {
    if (!isResizingChat) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('playground-container');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidth =
        ((containerRect.right - e.clientX) / containerRect.width) * 100;

      if (newWidth >= 20 && newWidth <= 60) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingChat(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingChat]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          {lessonId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.back()}
            >
              <ChevronLeftIcon />
            </Button>
          )}
          <h1 className="text-lg font-semibold">Code Playground</h1>
          <span className="text-sm text-muted-foreground px-2 py-1 rounded-md bg-muted">
            {language.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(language === 'html' ||
            language === 'css' ||
            language === 'javascript') && (
            <Button
              onClick={handleRunCode}
              size="sm"
              className="gap-2"
              variant="default"
            >
              <PlayIcon />
              Run Code
            </Button>
          )}

          <Button
            onClick={handleCheckWithAI}
            size="sm"
            className="gap-2"
            variant={showChat ? 'default' : 'outline'}
          >
            <SparklesIcon />
            {showChat ? 'Close Chat' : 'Check with AI'}
          </Button>
        </div>
      </div>

      <div
        id="playground-container"
        className="flex-1 flex overflow-hidden relative"
      >
        <div
          className="flex flex-col"
          style={{
            width: showChat
              ? `${100 - chatWidth}%`
              : showPreview
                ? `${previewWidth}%`
                : '100%',
          }}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
            <h2 className="text-sm font-medium">Editor</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              content={code}
              language={language}
              onSaveContent={handleCodeChange}
            />
          </div>
        </div>

        {showPreview &&
          !showChat &&
          (language === 'html' ||
            language === 'css' ||
            language === 'javascript') && (
            <>
              <button
                type="button"
                className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors relative group"
                onMouseDown={handlePreviewMouseDown}
                aria-label="Resize preview panel"
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-primary/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <div
                className="flex flex-col border-l"
                style={{ width: `${100 - previewWidth}%` }}
              >
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
                  <h2 className="text-sm font-medium">Preview</h2>
                  {/* biome-ignore lint/style/useSelfClosingElements: <explanation> */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                    className="h-6 w-6 p-0"
                  ></Button>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-white dark:bg-slate-950">
                  <CodePreview code={code} language={language} />
                </div>
              </div>
            </>
          )}

        {showChat && (
          <>
            <button
              type="button"
              className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors relative group"
              onMouseDown={handleChatMouseDown}
              aria-label="Resize chat panel"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-primary/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <div
              className="flex flex-col border-l bg-background"
              style={{ width: `${chatWidth}%` }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <SparklesIcon size={16} />
                  AI Assistant
                </h2>
                {/* biome-ignore lint/style/useSelfClosingElements: <explanation> */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(false)}
                  className="h-7 w-7 p-0"
                ></Button>
              </div>
              <div className="flex-1 overflow-hidden">
                {lessonId ? (
                  <LessonChat
                    key={`lesson-chat-${chatKey}`}
                    lessonId={lessonId}
                    initialSystemPrompt={`I am your AI coding assistant. I can help you understand code concepts, debug issues, and improve your solutions.

Current code context:
- Language: ${language}
- Code length: ${code.length} characters`}
                    lessonContent={`You are working on a ${language} coding exercise in the playground.`}
                    lessonType="practice"
                    session={session}
                    autoCreate={false}
                    initialMessages={chatInitialMessages}
                  />
                ) : (
                  <PlaygroundChat
                    key={`playground-chat-${chatKey}`}
                    initialMessages={chatInitialMessages}
                    language={language}
                    codeLength={code.length}
                    session={session}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
