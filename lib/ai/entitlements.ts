import type { UserType } from '@/app/(auth)/auth';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: [
      'gemini-2.5-flash-lite',
      'gemma-3',
      'codellama-7b-instruct',
    ],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      'gemini-2.5-pro', // 👈 thêm Pro vô đây
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemma-3',
      'codellama-7b-instruct',
    ],
  },
};
