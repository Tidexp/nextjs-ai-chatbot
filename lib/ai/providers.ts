import { customProvider } from 'ai';
import { groq } from '@ai-sdk/groq';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// Khởi tạo Groq client
const groq = new Groq({
  apiKey: process.env.XAI_API_KEY, // vẫn giữ biến cũ XAI_API_KEY cho đỡ sửa
});

// Helper: tạo model wrapper từ groq.chat.completions
function groqChat(model: string) {
  return {
    id: model,
    async *stream(prompt: string) {
      const chat = await groq.chat.completions.create({
        model,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      });
      for await (const chunk of chat) {
        yield chunk.choices[0]?.delta?.content ?? '';
      }
    },
  };
}

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
        'meta-llama/llama-guard-4-12b': groqChat(
          'meta-llama/llama-guard-4-12b'
        ),
        'gemma2-9b-it': groqChat('gemma2-9b-it'),
      },
    });
