export const DEFAULT_CHAT_MODEL: string = 'gemini-2.5-flash';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Most capable model for complex tasks',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast and efficient for most tasks',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Lightweight and quick responses',
  },
  {
    id: 'gemma-3',
    name: 'Gemma 3 12B',
    description: 'Open source model for general use',
  },
  {
    id: 'codellama-7b-instruct',
    name: 'Code Llama 7B Instruction',
    description:
      'Fine-tuned model for code generation and instruction following',
  },
];
