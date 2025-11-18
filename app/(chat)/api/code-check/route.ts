import { auth } from '@/app/(auth)/auth';
import { generateText } from 'ai';
import { getLessonById } from '@/lib/content/loader';
import { myProvider } from '@/lib/ai/providers';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { code, language, lessonId } = await request.json();

    if (!code || !language) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Get lesson context if lessonId provided
    let exercisePrompt = '';
    let lessonContext = '';

    if (lessonId) {
      try {
        const lesson = await getLessonById(lessonId);
        if (lesson?.metadata.exercisePrompt) {
          exercisePrompt = lesson.metadata.exercisePrompt;
        }
        if (lesson?.metadata.title) {
          lessonContext = `This code is from the lesson: "${lesson.metadata.title}"`;
        }
      } catch (error) {
        console.error('Error loading lesson:', error);
        // Continue without lesson context
      }
    }

    // Build the AI prompt
    const prompt = `You are a code review assistant. Analyze the following ${language} code and provide constructive feedback.

${lessonContext ? `Context: ${lessonContext}\n` : ''}
${exercisePrompt ? `Exercise Requirements:\n${exercisePrompt}\n` : ''}

Code to review:
\`\`\`${language}
${code}
\`\`\`

Please evaluate this code and respond with:
1. Whether the code meets the requirements (if applicable)
2. What's working well
3. Any issues or improvements needed
4. Specific suggestions for improvement

Keep your feedback encouraging and educational. Focus on helping the learner improve.`;

    const { text } = await generateText({
      model: myProvider.languageModel('gemini-2.5-flash-lite'),
      prompt,
    });

    // Simple heuristic to determine if code is "valid"
    // You can make this more sophisticated based on your needs
    const isValid =
      !text.toLowerCase().includes('critical error') &&
      !text.toLowerCase().includes('does not work') &&
      !text.toLowerCase().includes('completely incorrect') &&
      (text.toLowerCase().includes('good') ||
        text.toLowerCase().includes('correct') ||
        text.toLowerCase().includes('well') ||
        !exercisePrompt); // If no requirements, just provide feedback

    return Response.json({
      isValid,
      message: text,
    });
  } catch (error) {
    console.error('Error checking code:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
