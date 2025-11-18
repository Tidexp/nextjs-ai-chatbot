import { ReadableStream } from 'stream/web';
import type { ChatMessage, CustomUIDataTypes, ChatTools } from '@/lib/types';
import type { UIMessage } from 'ai';

export interface MessageChunk {
  id?: string;
  type: 'text-start' | 'text-delta' | 'text-end';
  delta?: string;
}

export interface StreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export class MessageStream {
  private encoder: TextEncoder;
  private decoder: TextDecoder;

  constructor() {
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  createStream(asyncIterator: AsyncIterator<Uint8Array>): ReadableStream {
    return new ReadableStream({
      async pull(controller) {
        try {
          const { value, done } = await asyncIterator.next();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(value);
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  async *generateChunks(response: Response): AsyncGenerator<MessageChunk> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const messageId = crypto.randomUUID();
    yield { type: 'text-start', id: messageId };

    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += this.decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield { type: 'text-delta', id: messageId, delta: content };
              }
            } catch {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (buffer) {
      try {
        const data = JSON.parse(buffer);
        const content = data.choices?.[0]?.delta?.content;
        if (content) {
          yield { type: 'text-delta', id: messageId, delta: content };
        }
      } catch {
        console.warn('Failed to parse remaining buffer:', buffer);
      }
    }

    yield { type: 'text-end', id: messageId };
  }

  createResponse(
    messages: ChatMessage[],
    options: StreamOptions = {},
  ): Promise<Response> {
    const body = JSON.stringify({
      model: options.model || 'gpt-4',
      messages: messages.map(m => ({
        role: m.role,
        content: m.parts
            ?.filter(p => p.type === 'text')
            .map(p => (p as { text: string }).text)
            .join('') || ''
      })),
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
      top_p: options.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0
    });

    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body
    });
  }

  async *processMessages(
    messages: ChatMessage[],
    options?: StreamOptions
  ): AsyncGenerator<MessageChunk> {
    const response = await this.createResponse(messages, options);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${text}`);
    }
    yield* this.generateChunks(response);
  }

  // Helper to convert a message chunk to the format expected by useChat
  static chunkToUIMessage(chunk: MessageChunk): Partial<ChatMessage> {
    const now = new Date().toISOString();
    const metadata = { createdAt: now };
    
    switch (chunk.type) {
      case 'text-start':
        return {
          id: chunk.id,
          role: 'assistant',
          parts: [{ type: 'text', text: '' }],
          metadata
        };
        
      case 'text-delta':
        return {
          id: chunk.id,
          role: 'assistant',
          parts: [{ type: 'text', text: chunk.delta || '' }],
          metadata
        };
        
      case 'text-end':
        return {
          id: chunk.id,
          role: 'assistant',
          parts: [{ type: 'text', text: '' }],
          metadata
        };
        
      default:
        throw new Error(`Unknown chunk type: ${(chunk as any).type}`);
    }
  }
}