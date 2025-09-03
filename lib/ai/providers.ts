import { customProvider } from 'ai';
import { groq } from '@ai-sdk/groq';

export const myProvider = customProvider({
  languageModels: {
    'meta-llama/llama-guard-4-12b': groq('meta-llama/llama-guard-4-12b'),
    'gemma2-9b-it': groq('gemma2-9b-it'),
  },
});
