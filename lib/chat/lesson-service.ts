import { z } from 'zod';

export const LessonTypeSchema = z.enum([
  'introduction',
  'theory',
  'exercise',
  'practice',
  'project',
  'quiz',
]);
export type LessonType = z.infer<typeof LessonTypeSchema>;

export interface LessonContext {
  lessonId: string;
  lessonType: LessonType;
  content?: string;
  exercisePrompt?: string | null;
  projectBrief?: string | null;
  customContext?: Record<string, unknown>;
}

type PromptTemplate = { system: string; welcome: string };

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class LessonService {
  private static promptTemplates: Record<LessonType, PromptTemplate> = {
    introduction: {
      system: `I am your personal AI tutor for this introductory lesson.
The lesson content is:

{content}

My role is to help you understand the core concepts and fundamentals. I will:
- Explain concepts clearly and provide relevant examples
- Answer your questions about the topic
- Help you build a strong foundation in this subject
- Provide analogies and real-world applications
- Check your understanding and clarify any confusion`,
      welcome:
        "Welcome! I'm here to help you understand this topic. What would you like to know about the lesson content?",
    },
    practice: {
      system: `I am your AI practice assistant.
Lesson content: {content}

Practice Exercise:
{exercisePrompt}

I will:
- Guide you through solving the exercise step-by-step  
- Provide helpful hints without giving away the answer
- Review your solutions and offer constructive feedback
- Help you understand any mistakes and how to correct them
- Reinforce the concepts being practiced`,
      welcome:
        "I'm here to help you with the practice exercise. Would you like to start working on it together?",
    },
    project: {
      system: `I am your AI project mentor.
Project context: {content}

Project Brief:
{projectBrief}

I will help you:
- Plan and break down the project into manageable tasks
- Design and implement your solution
- Debug issues and overcome technical challenges
- Review your code/work and suggest improvements
- Apply best practices and patterns`,
      welcome:
        "I'm here to help you with your project. Shall we discuss how to approach it?",
    },
    theory: {
      system: `I am your AI theory guide for this lesson.
The core concepts we'll explore are:

{content}

I will help you:
- Break down complex concepts into understandable parts
- Connect new ideas with your existing knowledge
- Provide clear examples and visual explanations
- Answer questions to deepen your understanding
- Apply concepts to solve problems`,
      welcome:
        "Let's explore these theoretical concepts together. What would you like to understand better?",
    },
    exercise: {
      system: `I am your AI coding exercise assistant.
Exercise context: {content}

Your task:
{exercisePrompt}

Starter code:
{starterCode}

I will help you:
- Understand the exercise requirements
- Guide you through the solution step by step
- Review your code and provide feedback
- Explain relevant concepts and best practices
- Debug issues and suggest improvements`,
      welcome:
        "Ready to practice coding? Let's work on this exercise together. Feel free to ask questions as we go!",
    },
    quiz: {
      system: `I am your AI quiz assistant.
Lesson content: {content}

I will:
- Help you prepare for the quiz
- Explain incorrect answers and why they're wrong
- Provide practice questions
- Test your understanding
- Give study tips and memory techniques`,
      welcome:
        'Ready to test your knowledge? I can help you prepare or review quiz topics. What would you like to focus on?',
    },
  };

  static getSystemPrompt(context: LessonContext): string {
    const template =
      LessonService.promptTemplates[context.lessonType]?.system ||
      LessonService.promptTemplates.introduction.system;

    return LessonService.interpolateTemplate(template, {
      content: context.content || '',
      exercisePrompt: context.exercisePrompt || '',
      projectBrief: context.projectBrief || '',
      ...context.customContext,
    });
  }

  static getWelcomeMessage(context: LessonContext): string {
    return (
      LessonService.promptTemplates[context.lessonType]?.welcome ||
      LessonService.promptTemplates.introduction.welcome
    );
  }

  private static interpolateTemplate(
    template: string,
    values: Record<string, unknown>,
  ): string {
    return template.replace(/{(\w+)}/g, (match, key) =>
      String(values[key] ?? match),
    );
  }

  static registerLessonType(type: LessonType, template: PromptTemplate): void {
    LessonService.promptTemplates[type] = template;
  }
}
