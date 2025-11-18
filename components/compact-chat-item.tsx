import type { Chat } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { TrashIcon } from './icons';

interface CompactChatItemProps {
  chat: Chat;
  isActive?: boolean;
  setOpenMobile?: (open: boolean) => void;
  onDelete?: (chatId: string) => void;
}

export function CompactChatItem({
  chat,
  isActive,
  setOpenMobile,
  onDelete,
}: CompactChatItemProps) {
  return (
    <div className="relative flex items-center group">
      <Link
        href={`/chat/${chat.id}`}
        onClick={() => setOpenMobile?.(false)}
        className={cn(
          'flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors',
          'hover:bg-muted',
          isActive ? 'bg-muted font-medium' : 'font-normal',
        )}
      >
        <span className="flex-1 truncate">{chat.title}</span>
      </Link>
      {onDelete && (
        <div className="absolute right-2 opacity-0 group-hover:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => onDelete(chat.id)}
              >
                <TrashIcon size={16} />
                <span className="sr-only">Delete chat</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete chat</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
