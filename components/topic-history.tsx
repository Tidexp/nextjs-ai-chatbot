import type { Chat } from '@/lib/db/schema';
import { SidebarHistoryGroup } from './sidebar-history-group';
import { SidebarMenu, useSidebar } from './ui/sidebar';
import { CompactChatItem } from './compact-chat-item';
import Link from 'next/link';

interface TopicHistoryProps {
  chats: Chat[];
  currentChatId?: string;
  onDelete: (chatId: string) => void;
  lastAccessedLessons?: Record<
    string,
    { moduleId: string; lessonId: string; slug: string }
  >;
}

export function TopicHistory({
  chats,
  currentChatId,
  onDelete,
  lastAccessedLessons,
}: TopicHistoryProps) {
  const { setOpenMobile } = useSidebar();
  // Filter for topic-related chats (those with topicId, moduleId, or lessonId)
  const topicChats = chats.filter(
    (chat) => chat.topicId || chat.moduleId || chat.lessonId,
  );

  // Group chats by topic
  const chatsByTopic = topicChats.reduce(
    (acc, chat) => {
      if (chat.topicId) {
        if (!acc[chat.topicId]) {
          acc[chat.topicId] = [];
        }
        acc[chat.topicId].push(chat);
      }
      return acc;
    },
    {} as Record<string, Chat[]>,
  );

  if (topicChats.length === 0) {
    return (
      <SidebarHistoryGroup
        label="Topics"
        isEmpty
        emptyMessage="No topic chats yet"
      />
    );
  }

  return (
    <SidebarHistoryGroup label="Topics">
      <SidebarMenu>
        {Object.entries(chatsByTopic).map(([topicId, topicChatList]) => {
          const lastLesson = lastAccessedLessons?.[topicId];

          return (
            <div key={topicId} className="space-y-1">
              {lastLesson && (
                <Link
                  href={`/topics/${lastLesson.slug}/modules/${lastLesson.moduleId}/lessons/${lastLesson.lessonId}`}
                  onClick={() => setOpenMobile(false)}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-[#04AA6D] hover:bg-muted rounded-md transition-colors font-medium"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M5 12h14M12 5l7 7-7 7"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Continue Learning
                </Link>
              )}
              {topicChatList.map((chat) => (
                <CompactChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  setOpenMobile={setOpenMobile}
                  onDelete={() => onDelete(chat.id)}
                />
              ))}
            </div>
          );
        })}
      </SidebarMenu>
    </SidebarHistoryGroup>
  );
}
