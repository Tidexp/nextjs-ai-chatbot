'use client';

import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  avatar?: string;
}

interface CompactMessageProps {
  message: Message;
  isLastInGroup?: boolean;
}

export const CompactMessage = memo(function CompactMessage({
  message,
  isLastInGroup
}: CompactMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full items-start gap-4 py-2.5',
        !isLastInGroup && 'pb-0'
      )}
    >
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarFallback>
          {isUser ? 'U' : 'A'}
        </AvatarFallback>
        {message.avatar && (
          <AvatarImage src={message.avatar} alt={isUser ? 'User' : 'Assistant'} />
        )}
      </Avatar>
      <Card className={cn(
        'flex-1 px-3 py-2 text-sm bg-muted',
        isUser && 'bg-primary/10'
      )}>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {message.content}
        </div>
      </Card>
    </div>
  );
});