'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { memo, useState, useEffect } from 'react';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, VercelIcon, PencilEditIcon } from './icons';
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
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title || '');

  // Update local title when prop changes
  useEffect(() => {
    setEditTitle(title || '');
  }, [title]);

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle !== title) {
      try {
        await updateChatTitle({ chatId, title: editTitle.trim() });
        toast.success('Chat title updated');
        setIsEditing(false);
        // Trigger a refresh of the chat list
        window.dispatchEvent(new CustomEvent('chatTitleUpdated', { 
          detail: { chatId, newTitle: editTitle.trim() } 
        }));
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

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />

      {title && (
        <div className="flex-1 min-w-0 mx-2">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm bg-transparent border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
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

      {(!open || windowWidth < 768) && (
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

      <Button
        className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 hidden md:flex py-1.5 px-2 h-fit md:h-[34px] order-4 md:ml-auto"
        asChild
      >
        <Link
          href={`https://vercel.com/new/clone?repository-url=https://github.com/vercel/ai-chatbot&env=AUTH_SECRET&envDescription=Learn more about how to get the API Keys for the application&envLink=https://github.com/vercel/ai-chatbot/blob/main/.env.example&demo-title=AI Chatbot&demo-description=An Open-Source AI Chatbot Template Built With Next.js and the AI SDK by Vercel.&demo-url=https://chat.vercel.ai&products=[{"type":"integration","protocol":"ai","productSlug":"grok","integrationSlug":"xai"},{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"},{"type":"integration","protocol":"storage","productSlug":"upstash-kv","integrationSlug":"upstash"},{"type":"blob"}]`}
          target="_noblank"
        >
          <VercelIcon size={16} />
          Deploy with Vercel
        </Link>
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId && prevProps.title === nextProps.title;
});
