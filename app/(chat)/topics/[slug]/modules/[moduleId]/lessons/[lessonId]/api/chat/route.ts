import { auth } from '@/app/(auth)/auth';

export const runtime = 'edge';

function flattenMessageContent(msg: any) {
  if (!msg) return '';
  if (typeof msg.content === 'string') return msg.content;
  // If message has parts (UIMessage style), join text parts
  if (Array.isArray(msg.parts)) {
    return msg.parts.map((p: any) => p.text || '').join('');
  }
  return '';
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const json = await req.json();
    const { messages = [], lessonContent = '', lessonType, exercisePrompt, projectBrief } = json;

    const basePrompt = `You are an AI tutor helping with a ${lessonType} lesson. The lesson content is:\n\n${lessonContent}\n\n`;
    const systemPrompt = lessonType === 'practice' && exercisePrompt
      ? `${basePrompt}Practice Exercise:\n${exercisePrompt}\n\nHelp the user complete this exercise.`
      : lessonType === 'project' && projectBrief
      ? `${basePrompt}Project Brief:\n${projectBrief}\n\nHelp the user plan and implement this project.`
      : `${basePrompt}Answer questions and explain concepts from this lesson.`;

    // Map UI messages to OpenAI chat format
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role || 'user', content: flattenMessageContent(m) }))
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-4', messages: chatMessages, max_tokens: 1024 }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('OpenAI error:', res.status, text);
      return new Response('AI service error', { status: 502 });
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ reply }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Error in lesson chat:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}