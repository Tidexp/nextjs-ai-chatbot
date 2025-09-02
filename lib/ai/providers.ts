import { customProvider } from 'ai';
import { groq } from '@ai-sdk/groq';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// myProvider config
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
        'meta-llama/llama-guard-4-12b': groq('meta-llama/llama-guard-4-12b'),
        'gemma2-9b-it': groq('gemma2-9b-it'),
      },
    });
