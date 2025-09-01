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
      'meta-llama/llama-guard-4-12b',
      'gemma2-9b-it',
    ],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      'meta-llama/llama-guard-4-12b',
      'gemma2-9b-it',
    ],
  },

  /*
   * For users with a paid membership (TODO)
   */
  // pro: {
  //   maxMessagesPerDay: 1000,
  //   availableChatModelIds: [
  //     'meta-llama/llama-guard-4-12b',
  //     'gemma2-9b-it',
  //   ],
  // },
};
