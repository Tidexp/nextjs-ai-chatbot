import { customProvider } from 'ai';
import { groq } from '@ai-sdk/groq';

export const myProvider = customProvider({
  languageModels: {
    'meta-llama/llama-guard-4-12b': groq('meta-llama/llama-guard-4-12b', {
      apiKey: process.env.XAI_API_KEY!,
    }),
    'gemma2-9b-it': groq('gemma2-9b-it', {
      apiKey: process.env.XAI_API_KEY!,
    }),
  },
});
