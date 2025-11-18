import { getUserPreferences, getResponseQualityMetrics } from '@/lib/db/queries';
import type { UserPreferences } from '@/lib/db/schema';

export interface UserContext {
  userId: string;
  preferences: UserPreferences[];
  qualityHistory: {
    averageQuality: number;
    commonIssues: string[];
    preferredResponseStyle: string;
  };
}

export interface FeedbackInsights {
  userPreferences: {
    responseStyle: string;
    detailLevel: string;
    tone: string;
    format: string;
  };
  qualityTrends: {
    improving: boolean;
    averageScore: number;
    commonDownvoteReasons: string[];
  };
  personalizedPrompts: {
    systemPrompt: string;
    userPromptEnhancements: string[];
  };
}

/**
 * Analyzes user feedback to generate personalized AI context
 */
export async function generateUserContext(userId: string): Promise<UserContext> {
  try {
    const [preferences, qualityMetrics] = await Promise.all([
      getUserPreferences({ userId }),
      getResponseQualityMetrics({ userId, limit: 100 }),
    ]);

    // Analyze quality history
    const qualityScores = qualityMetrics
      .filter(m => m.averageQualityScore)
      .map(m => m.averageQualityScore!);
    
    const averageQuality = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
      : 5;

    // Extract common issues from downvote reasons
    const commonIssues = qualityMetrics
      .filter(m => m.downvotes > m.upvotes)
      .map(m => 'quality_issue') // This would be enhanced with actual downvote reasons
      .slice(0, 3);

    // Determine preferred response style from preferences
    const responseStylePref = preferences.find(p => p.preferenceType === 'response_style');
    const preferredResponseStyle = responseStylePref?.preferenceValue || 'balanced';

    return {
      userId,
      preferences,
      qualityHistory: {
        averageQuality,
        commonIssues,
        preferredResponseStyle,
      },
    };
  } catch (error) {
    console.error('Error generating user context:', error);
    return {
      userId,
      preferences: [],
      qualityHistory: {
        averageQuality: 5,
        commonIssues: [],
        preferredResponseStyle: 'balanced',
      },
    };
  }
}

/**
 * Generates personalized system prompts based on user feedback
 */
export function generatePersonalizedSystemPrompt(userContext: UserContext): string {
  const { preferences, qualityHistory } = userContext;
  
  let basePrompt = "You are a helpful AI assistant. ";
  
  // Add response style preferences
  const responseStylePref = preferences.find(p => p.preferenceType === 'response_style');
  if (responseStylePref && responseStylePref.confidence > 0.6) {
    switch (responseStylePref.preferenceValue) {
      case 'detailed':
        basePrompt += "Provide comprehensive, detailed responses with thorough explanations. ";
        break;
      case 'concise':
        basePrompt += "Keep responses concise and to the point. ";
        break;
      case 'conversational':
        basePrompt += "Use a friendly, conversational tone. ";
        break;
      case 'technical':
        basePrompt += "Use precise technical language and terminology. ";
        break;
    }
  }

  // Add detail level preferences
  const detailLevelPref = preferences.find(p => p.preferenceType === 'detail_level');
  if (detailLevelPref && detailLevelPref.confidence > 0.6) {
    switch (detailLevelPref.preferenceValue) {
      case 'high':
        basePrompt += "Include examples, context, and step-by-step explanations. ";
        break;
      case 'medium':
        basePrompt += "Provide balanced detail with key points and brief explanations. ";
        break;
      case 'low':
        basePrompt += "Focus on essential information only. ";
        break;
    }
  }

  // Add tone preferences
  const tonePref = preferences.find(p => p.preferenceType === 'tone');
  if (tonePref && tonePref.confidence > 0.6) {
    switch (tonePref.preferenceValue) {
      case 'formal':
        basePrompt += "Maintain a professional, formal tone. ";
        break;
      case 'casual':
        basePrompt += "Use a relaxed, casual tone. ";
        break;
      case 'encouraging':
        basePrompt += "Be encouraging and supportive in your responses. ";
        break;
    }
  }

  // Address quality issues
  if (qualityHistory.averageQuality < 6) {
    basePrompt += "Pay special attention to accuracy and clarity. Double-check facts and provide clear explanations. ";
  }

  if (qualityHistory.commonIssues.includes('quality_issue')) {
    basePrompt += "Ensure responses are helpful and directly address the user's question. ";
  }

  return basePrompt;
}

/**
 * Generates insights for improving AI responses
 */
export function generateFeedbackInsights(userContext: UserContext): FeedbackInsights {
  const { preferences, qualityHistory } = userContext;

  // Extract user preferences
  const responseStyle = preferences.find(p => p.preferenceType === 'response_style')?.preferenceValue || 'balanced';
  const detailLevel = preferences.find(p => p.preferenceType === 'detail_level')?.preferenceValue || 'medium';
  const tone = preferences.find(p => p.preferenceType === 'tone')?.preferenceValue || 'neutral';
  const format = preferences.find(p => p.preferenceType === 'format')?.preferenceValue || 'standard';

  // Analyze quality trends
  const improving = qualityHistory.averageQuality > 6;
  const commonDownvoteReasons = qualityHistory.commonIssues;

  // Generate personalized prompts
  const systemPrompt = generatePersonalizedSystemPrompt(userContext);
  const userPromptEnhancements = [
    `User prefers ${responseStyle} responses`,
    `Detail level: ${detailLevel}`,
    `Tone: ${tone}`,
    `Format: ${format}`,
  ];

  return {
    userPreferences: {
      responseStyle,
      detailLevel,
      tone,
      format,
    },
    qualityTrends: {
      improving,
      averageScore: qualityHistory.averageQuality,
      commonDownvoteReasons,
    },
    personalizedPrompts: {
      systemPrompt,
      userPromptEnhancements,
    },
  };
}

/**
 * Updates user preferences based on new feedback
 */
export async function updatePreferencesFromFeedback(
  userId: string,
  feedback: {
    voteType: 'up' | 'down' | 'neutral';
    qualityScore?: number;
    helpfulnessScore?: number;
    accuracyScore?: number;
    clarityScore?: number;
    downvoteReason?: string;
  },
  messageContent: string
): Promise<void> {
  try {
    const { updateUserPreference } = await import('@/lib/db/queries');

    // Analyze message content to extract preferences
    const isDetailed = messageContent.length > 500;
    const isTechnical = /[A-Z]{2,}|API|HTTP|JSON|SQL|code|function|algorithm/i.test(messageContent);
    const isConversational = /I think|I believe|Let me|How about|What do you think/i.test(messageContent);

    // Update preferences based on positive feedback
    if (feedback.voteType === 'up' && feedback.qualityScore && feedback.qualityScore >= 7) {
      const confidence = feedback.qualityScore / 10;

      if (isDetailed) {
        await updateUserPreference({
          userId,
          preferenceType: 'detail_level',
          preferenceValue: 'high',
          confidence,
        });
      }

      if (isTechnical) {
        await updateUserPreference({
          userId,
          preferenceType: 'response_style',
          preferenceValue: 'technical',
          confidence,
        });
      }

      if (isConversational) {
        await updateUserPreference({
          userId,
          preferenceType: 'tone',
          preferenceValue: 'conversational',
          confidence,
        });
      }
    }

    // Learn from negative feedback
    if (feedback.voteType === 'down' && feedback.downvoteReason) {
      const confidence = 0.8; // High confidence in negative feedback

      switch (feedback.downvoteReason) {
        case 'too_long':
          await updateUserPreference({
            userId,
            preferenceType: 'detail_level',
            preferenceValue: 'low',
            confidence,
          });
          break;
        case 'too_short':
          await updateUserPreference({
            userId,
            preferenceType: 'detail_level',
            preferenceValue: 'high',
            confidence,
          });
          break;
        case 'unhelpful':
          await updateUserPreference({
            userId,
            preferenceType: 'response_style',
            preferenceValue: 'direct',
            confidence,
          });
          break;
      }
    }
  } catch (error) {
    console.error('Error updating preferences from feedback:', error);
  }
}
