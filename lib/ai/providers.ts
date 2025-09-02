import { customProvider } from 'ai';
import { openai } from 'ai/openai'; // dùng Groq API theo chuẩn OpenAI
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        // match với chatModels id
        'meta-llama/llama-guard-4-12b': openai.chat({
          model: 'meta-llama/llama-guard-4-12b',
          apiKey: process.env.XAI_API_KEY!,
          baseURL: 'https://api.groq.com/openai/v1',
        }),
        'gemma2-9b-it': openai.chat({
          model: 'gemma2-9b-it',
          apiKey: process.env.XAI_API_KEY!,
          baseURL: 'https://api.groq.com/openai/v1',
        }),
      },
    });
