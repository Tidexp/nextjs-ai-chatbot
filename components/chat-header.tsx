'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { memo, useState, useEffect, useCallback } from 'react';

import { ModelSelector } from '@/components/model-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, PencilEditIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import type { Session } from 'next-auth';
import { updateChatTitle } from '@/app/(chat)/actions';
import { toast } from 'sonner';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  session,
  title,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  title?: string;
}) {
  const router = useRouter();
  const { open, state } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title || '');

  // Update local title when prop changes
  useEffect(() => {
    setEditTitle(title || '');
  }, [title]);

  // Callback ref to focus and select text immediately when input mounts
  const inputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.focus();
      node.select();
    }
  }, []);

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle !== title) {
      try {
        await updateChatTitle({ chatId, title: editTitle.trim() });
        toast.success('Chat title updated');
        setIsEditing(false);
        // Trigger a refresh of the chat list
        window.dispatchEvent(
          new CustomEvent('chatTitleUpdated', {
            detail: { chatId, newTitle: editTitle.trim() },
          }),
        );
      } catch (error) {
        toast.error('Failed to update title');
        setEditTitle(title || '');
      }
    } else {
      setEditTitle(title || '');
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditTitle(title || '');
      setIsEditing(false);
    }
  };

  const isCollapsed = state === 'collapsed';

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      {title && (
        <div className="flex-1 min-w-0 mx-2">
          {isEditing ? (
            <Input
              ref={inputCallbackRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm px-2 py-1 bg-muted border-border"
            />
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-lg font-semibold truncate">{title}</h1>
              {!isReadonly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditing(true)}
                >
                  <PencilEditIcon size={14} />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {(!open || windowWidth < 768) && !isCollapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <ModelSelector
          session={session}
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )}

      <Button variant="outline" className="order-4" asChild>
        <Link href="/topics">Topics</Link>
      </Button>

      {/* Removed Deploy with Vercel button */}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.title === nextProps.title
  );
});
