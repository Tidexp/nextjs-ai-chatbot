import { myProvider } from '@/lib/ai/providers';
import { streamText } from 'ai';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { messages, language, codeLength } = await request.json();

    const systemPrompt = `You are a helpful AI coding assistant for a code playground. 

Current context:
- Language: ${language}
- Code length: ${codeLength} characters

Help the student understand coding concepts, debug issues, and improve their solutions. Be encouraging and educational.`;

    const result = streamText({
      model: myProvider.languageModel('gemini-2.5-flash-lite'),
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.parts[0]?.text || '',
      })),
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[playground-chat] Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
