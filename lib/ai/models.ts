export const DEFAULT_CHAT_MODEL: string = 'meta-llama/llama-guard-4-12b';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
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
