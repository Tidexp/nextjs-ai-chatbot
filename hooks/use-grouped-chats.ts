import { useMemo } from 'react';
import type { Chat } from '@/lib/db/schema';

export function useGroupedChats(chats: Chat[] | undefined) {
  return useMemo(() => {
    if (!chats || chats.length === 0) {
      return {
        topicChats: [] as Chat[],
        generalChats: [] as Chat[],
      };
    }

    const topicChats: Chat[] = [];
    const generalChats: Chat[] = [];

    for (const c of chats) {
      // Consider as topic chat if any of the association ids exist
      if (c.topicId || c.moduleId || c.lessonId) {
        topicChats.push(c);
      } else {
        generalChats.push(c);
      }
    }

    // Optionally sort topicChats by recent activity:
    topicChats.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });

    generalChats.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });

    return { topicChats, generalChats };
  }, [chats]);
}
