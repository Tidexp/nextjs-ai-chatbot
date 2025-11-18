'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import type { User } from 'next-auth';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  // Loại bỏ import không cần thiết nếu SidebarGroup/SidebarGroupContent chỉ dùng cho lỗi tải/chưa đăng nhập
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import type { Chat } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { ChatItem } from './sidebar-history-item';
import useSWRInfinite from 'swr/infinite';
import { LoaderIcon } from './icons';
import { useGroupedChats } from '@/hooks/use-grouped-chats';
import { SidebarHistoryGroup } from './sidebar-history-group';
import { TopicHistory } from './topic-history';
import { deleteChat } from '@/app/(chat)/actions';

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

export interface ChatHistory {
  chats: Array<Chat>;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      // Đảm bảo chat.createdAt là kiểu Date hợp lệ
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats,
  );
};

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory,
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return null;
  }

  if (pageIndex === 0) return `/api/history?limit=${PAGE_SIZE}`;

  // Sử dụng kiểm tra an toàn thay vì chỉ dùng at(-1)
  const firstChatFromPage =
    previousPageData.chats[previousPageData.chats.length - 1];

  if (!firstChatFromPage) return null;

  return `/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}`;
}

export function SidebarHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  // Giả định id từ useParams là string (ID chat hiện tại) hoặc undefined
  const { id } = useParams();
  const currentChatId = typeof id === 'string' ? id : undefined;

  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, fetcher, {
    fallbackData: [],
  });

  // Fetch last accessed lessons for continue learning feature
  const { data: lastAccessedLessons } = useSWR<
    Record<string, { moduleId: string; lessonId: string; slug: string }>
  >(user ? '/api/last-accessed-lessons' : null, fetcher);

  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Show dialog when deleteId is set
  useEffect(() => {
    if (deleteId) {
      setShowDeleteDialog(true);
    }
  }, [deleteId]);

  // Listen for title updates and refresh the chat list
  useEffect(() => {
    const refresh = () => mutate();
    // Đảm bảo mutate không bị gọi quá thường xuyên nếu có nhiều sự kiện
    window.addEventListener('chatTitleUpdated', refresh);
    window.addEventListener('chatCreated', refresh);
    return () => {
      window.removeEventListener('chatTitleUpdated', refresh);
      window.removeEventListener('chatCreated', refresh);
    };
  }, [mutate]);

  const hasReachedEnd = paginatedChatHistories
    ? paginatedChatHistories.some((page) => page.hasMore === false)
    : false;

  const allChats = paginatedChatHistories?.flatMap((h) => h.chats) || [];
  const hasChats = allChats.length > 0;
  // Group chats into topic vs general using a hook (must be called unconditionally)
  const { topicChats, generalChats } = useGroupedChats(allChats);

  const handleDelete = async () => {
    if (!deleteId) return;

    console.log('[SidebarHistory] Deleting chat:', deleteId);

    const deletePromise = deleteChat({ chatId: deleteId });

    toast.promise(deletePromise, {
      loading: 'Deleting chat...',
      success: () => {
        console.log('[SidebarHistory] Chat deleted successfully');
        // Cập nhật dữ liệu cục bộ bằng cách lọc chat đã xóa
        mutate((chatHistories) => {
          if (chatHistories) {
            return chatHistories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.filter((chat) => chat.id !== deleteId),
            }));
          }
        }, false); // `false` để không fetch lại toàn bộ mà dùng dữ liệu đã mutate

        return 'Chat deleted successfully';
      },
      error: (err) => {
        console.error('[SidebarHistory] Delete error:', err);
        return 'Failed to delete chat';
      },
    });

    setShowDeleteDialog(false);
    setDeleteId(null);

    if (deleteId === currentChatId) {
      router.push('/');
    }
  };

  // --- LOGIC TRẢ VỀ SỚM ĐÃ ĐƠN GIẢN HÓA ---

  // 1. Trường hợp chưa đăng nhập
  if (!user) {
    return (
      <SidebarHistoryGroup
        label="History"
        isEmpty
        emptyMessage="Login to save and revisit previous chats!"
      />
    );
  }

  // 2. Trường hợp đang tải dữ liệu (Loading)
  if (isLoading) {
    return (
      <SidebarHistoryGroup label="Loading...">
        <div className="flex flex-col gap-2 px-2">
          {/* Skeleton loading UI */}
          {[44, 32, 28, 64, 52].map((width) => (
            <div
              key={width}
              className="h-8 rounded-md bg-sidebar-accent-foreground/10"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </SidebarHistoryGroup>
    );
  }

  // 3. Trường hợp đã tải xong nhưng không có chat
  if (!hasChats) {
    return (
      <>
        {/* TopicHistory được truyền chats rỗng */}
        <TopicHistory
          chats={[]}
          currentChatId={currentChatId}
          onDelete={setDeleteId}
          lastAccessedLessons={lastAccessedLessons}
        />
        <SidebarHistoryGroup
          label="General"
          isEmpty
          emptyMessage="Your conversations will appear here once you start chatting!"
        />
      </>
    );
  }

  // --- HIỂN THỊ LỊCH SỬ CHAT (TRƯỜNG HỢP CÓ DỮ LIỆU) ---

  return (
    <>
      <TopicHistory
        chats={topicChats}
        currentChatId={currentChatId}
        onDelete={setDeleteId}
        lastAccessedLessons={lastAccessedLessons}
      />

      <SidebarHistoryGroup label="General" isEmpty={generalChats.length === 0}>
        <SidebarMenu>
          {generalChats.map((c) => (
            <ChatItem
              key={c.id}
              chat={c}
              isActive={c.id === currentChatId}
              onDelete={setDeleteId}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </SidebarMenu>
      </SidebarHistoryGroup>

      {/* Logic Infinite Scrolling (tải thêm khi cuộn) */}
      {!hasReachedEnd && (
        <motion.div
          onViewportEnter={() => {
            if (!isValidating) {
              setSize((size) => size + 1);
            }
          }}
          className="py-2 text-center"
        >
          {isValidating && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin">
                <LoaderIcon size={16} />
              </div>
              Loading more...
            </div>
          )}
        </motion.div>
      )}

      {/* AlertDialog (Dialog xác nhận xóa) */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
