'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';
import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CheckCircleFillIcon, ChevronDownIcon } from './icons';
import type { Session } from 'next-auth';

export function ModelSelector({
  session,
  selectedModelId,
  chatId,
  userInput,
}: {
  session: Session;
  selectedModelId: string;
  chatId: string;
  userInput: string;
}) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  // Chỉ có 2 model thôi
  const availableChatModels = [
    {
      id: 'meta-llama/llama-guard-4-12b',
      name: 'LLaMA Guard 12B',
      description: 'Safe + advanced code',
    },
    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B',
      description: 'Fast, lightweight code',
    },
  ];

  const selectedChatModel = useMemo(
    () =>
      availableChatModels.find(
        (chatModel) => chatModel.id === optimisticModelId
      ),
    [optimisticModelId, availableChatModels]
  );

  // Hàm gửi message POST /api/chat
  const sendMessage = async (modelId: string) => {
    const payload = {
      id: chatId,
      message: {
        id: crypto.randomUUID(),
        role: 'user',
        parts: [userInput],
      },
      selectedChatModel: modelId,
      selectedVisibilityType: 'private', // hoặc 'public' nếu cần
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('Failed to send message', await res.text());
      }
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground'
        )}
      >
        <Button data-testid="model-selector" variant="outline" className="md:px-2 md:h-[34px]">
          {selectedChatModel?.name}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[300px]">
        {availableChatModels.map((chatModel) => (
          <DropdownMenuItem
            data-testid={`model-selector-item-${chatModel.id}`}
            key={chatModel.id}
            onSelect={() => {
              setOpen(false);
              startTransition(() => {
                setOptimisticModelId(chatModel.id);
                saveChatModelAsCookie(chatModel.id);
                sendMessage(chatModel.id); // gửi luôn khi chọn model
              });
            }}
            data-active={chatModel.id === optimisticModelId}
            asChild
          >
            <button type="button" className="gap-4 group/item flex flex-row justify-between items-center w-full">
              <div className="flex flex-col gap-1 items-start">
                <div>{chatModel.name}</div>
                <div className="text-xs text-muted-foreground">{chatModel.description}</div>
              </div>

              <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                <CheckCircleFillIcon />
              </div>
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
