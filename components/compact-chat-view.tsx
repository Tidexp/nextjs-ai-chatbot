'use client';

import { memo, useState } from 'react';
import { CompactMessage } from './compact-message';
import { ContentEditor } from './content-editor';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface CompactChatViewProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

export const CompactChatView = memo(function CompactChatView({
  messages,
  onSendMessage,
  isLoading = false
}: CompactChatViewProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, i) => (
            <CompactMessage
              key={message.id}
              message={message}
              isLastInGroup={i === messages.length - 1}
            />
          ))}
        </div>
      </ScrollArea>
      <div className="border-t">
        <ContentEditor
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isLoading}
          placeholder="Type your message..."
          submitLabel={isLoading ? 'Sending...' : 'Send'}
        />
      </div>
    </Card>
  );
});