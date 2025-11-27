'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Chat } from '@/components/chat';
import type { ChatMessage } from '@/lib/types';
import type { Session } from 'next-auth';

export interface LessonChatProps {
  lessonId: string;
  topicId?: string;
  moduleId?: string;
  initialSystemPrompt?: string;
  lessonContent?: string;
  lessonType?: string;
  exercisePrompt?: string;
  projectBrief?: string;
  session?: Session | null;
  // optional: allow autoCreate for older behavior
  autoCreate?: boolean;
  // optional: override initial messages
  initialMessages?: any[];
}

export function LessonChat(props: LessonChatProps) {
  // Default system prompt based on lesson type
  const getDefaultSystemPrompt = () => {
    const basePrompt = `I am your personal AI tutor for this lesson. The lesson content is:\n\n${props.lessonContent}\n\n`;

    switch (props.lessonType) {
      case 'introduction':
        return `${basePrompt}I will help explain concepts, provide examples, and answer your questions about this topic.`;
      case 'practice':
        return `${basePrompt}Practice Exercise:\n${props.exercisePrompt}\n\nI will guide you through this exercise, provide hints, and review your solutions.`;
      case 'project':
        return `${basePrompt}Project Brief:\n${props.projectBrief}\n\nI will help you plan, implement, and review your project work.`;
      default:
        return `${basePrompt}Ask me any questions about this lesson and I will help you understand the material better.`;
    }
  };

  const [initialMessages] = useState<ChatMessage[]>(() => {
    // Use provided initial messages if available
    if (props.initialMessages && props.initialMessages.length > 0) {
      return props.initialMessages as ChatMessage[];
    }

    // Otherwise use default welcome message
    const now = new Date().toISOString();
    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text:
              props.lessonType === 'introduction'
                ? "Welcome! I'm here to help you understand this topic. What would you like to know about the lesson content?"
                : props.lessonType === 'practice'
                  ? "I'm here to help you with the practice exercise. Would you like to start working on it together?"
                  : props.lessonType === 'project'
                    ? "I'm here to help you with your project. Shall we discuss how to approach it?"
                    : 'How can I help you with this lesson?',
          },
        ],
        createdAt: now,
      } as unknown as ChatMessage,
    ];
  });

  // Lesson context (system prompt) shown separately in a compact, collapsible panel
  const systemPrompt = props.initialSystemPrompt || getDefaultSystemPrompt();
  const [showContext, setShowContext] = useState(false);

  // When entering a lesson page, make sure the viewport focuses at the top
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      setTimeout(() => window.scrollTo(0, 0), 60);
    } catch {}
  }, []);

  const [chatId, setChatId] = useState<string | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const lastRequestTimeRef = useRef(0);

  // create/find chat on-demand with rate limiting
  const createOrGetChat = useCallback(async () => {
    if (chatId || loadingChat) return chatId;

    // Prevent request flooding - minimum 500ms between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    if (timeSinceLastRequest < 500) {
      console.log('[LessonChat] Throttling request - too soon');
      return null;
    }
    lastRequestTimeRef.current = now;

    // Abort if navigation is blocked
    if (typeof window !== 'undefined' && (window as any).__NAV_BLOCKED__) {
      console.warn(
        '[LessonChat] Navigation is blocked, aborting chat creation',
      );
      return null;
    }

    setLoadingChat(true);

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Exponential backoff for retries
    const backoffDelay = Math.min(
      1000 * Math.pow(2, retryCountRef.current),
      5000,
    );
    if (retryCountRef.current > 0) {
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }

    try {
      // Abort if navigation is blocked before fetch
      if (typeof window !== 'undefined' && (window as any).__NAV_BLOCKED__) {
        console.warn(
          '[LessonChat] Navigation is blocked, aborting chat creation',
        );
        setLoadingChat(false);
        return null;
      }
      const res = await fetch('/api/lesson-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: props.lessonId,
          topicId: props.topicId,
          moduleId: props.moduleId,
        }),
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error('Failed to create/find lesson chat');
      const data = await res.json();

      // Reset retry count on success
      retryCountRef.current = 0;

      // Only update state if component is still mounted and navigation is not blocked
      if (
        isMountedRef.current &&
        !(typeof window !== 'undefined' && (window as any).__NAV_BLOCKED__)
      ) {
        setChatId(data.id);
      }
      return data.id;
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return null;
      }

      // Increment retry count for backoff
      retryCountRef.current++;
      throw error;
    } finally {
      if (isMountedRef.current) {
        setLoadingChat(false);
      }
      abortControllerRef.current = null;
    }
  }, [chatId, loadingChat, props.lessonId, props.topicId, props.moduleId]);

  // If older behavior desired, auto-create when autoCreate === true:
  useEffect(() => {
    if (props.autoCreate) {
      createOrGetChat().catch(() => {});
    }
  }, [props.autoCreate, createOrGetChat]);

  // Cleanup on unmount - abort requests and reset chat state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      // Mark as unmounted first to prevent state updates
      isMountedRef.current = false;

      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Reset state when unmounting to prevent stale data on navigation
      setChatId(null);
      setLoadingChat(false);
    };
  }, []);

  // Called when user submits first message in this lesson chat
  const handleFirstSend = async (messageText: string) => {
    const id = await createOrGetChat();
    // then forward to existing sendMessage flow:
    // sendMessage({ chatId: id, text: messageText, ... })
  };

  return (
    <div className="mt-4 pt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">Lesson context</div>
        <button
          type="button"
          onClick={() => setShowContext((s) => !s)}
          className="text-xs text-indigo-600 hover:underline"
        >
          {showContext ? 'Hide' : 'Show'}
        </button>
      </div>

      {showContext && (
        <div className="mb-3 p-3 bg-muted rounded-md text-sm prose-sm max-w-none">
          {/* Render short, readable context instead of long system prompt */}
          <div>{systemPrompt}</div>
        </div>
      )}

      {!chatId ? (
        <div className="p-3 space-y-3">
          <button
            type="button"
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-sky-600 hover:to-indigo-700 transition-all font-medium shadow-sm hover:shadow-md"
            onClick={() => createOrGetChat()}
            disabled={loadingChat}
          >
            {loadingChat ? 'Starting chat...' : 'Start lesson chat'}
          </button>

          <div className="text-sm text-muted-foreground text-center">
            Click the button above to start chatting with your AI tutor
          </div>
        </div>
      ) : (
        // existing Chat component usage; pass compact mode for lesson UI
        <Chat
          id={chatId}
          initialMessages={initialMessages}
          initialVisibilityType="private"
          initialChatModel="gpt-4"
          isReadonly={false}
          session={props.session as any}
          compact={true}
        />
      )}
    </div>
  );
}
