import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  or,
  type SQL,
  type InferInsertModel,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  type DBMessage,
  vote,
  type Chat,
  stream,
  responseFeedback,
  userPreferences,
  responseAnalytics,
  type ResponseFeedback,
  type UserPreferences,
  type ResponseAnalytics,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(email: string, password: string, displayName?: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ 
      email, 
      password: hashedPassword,
      type: 'regular',
      displayName: displayName || null
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ 
      email, 
      password,
      type: 'guest',
      displayName: null
    }).returning({
      id: user.id,
      email: user.email,
      type: user.type,
      displayName: user.displayName,
    });
  } catch (error) {
    console.error('Database error in createGuestUser:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    // First check if user exists
    const existingUser = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    if (existingUser.length === 0) {
      console.error('User not found in database:', userId);
      throw new ChatSDKError('bad_request:database', 'User not found');
    }
    
    console.log('Creating chat for user:', userId, 'with title:', title);
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    console.error('Database error in saveChat:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    return await db.transaction(async (tx) => {
      // collect message ids for this chat
      const msgIds = await tx
        .select({ id: message.id })
        .from(message)
        .where(eq(message.chatId, id));
      const messageIds = msgIds.map((m) => m.id);

      // delete dependent rows first
      if (messageIds.length > 0) {
        try {
          await tx
            .delete(responseFeedback)
            .where(inArray(responseFeedback.messageId, messageIds));
        } catch (e) {
          console.warn('[deleteChatById] responseFeedback delete skipped/cascades', e);
        }
        try {
          await tx
            .delete(responseAnalytics)
            .where(inArray(responseAnalytics.messageId, messageIds));
        } catch (e) {
          console.warn('[deleteChatById] responseAnalytics delete skipped/cascades', e);
        }
        await tx.delete(vote).where(and(eq(vote.chatId, id), inArray(vote.messageId, messageIds)));
      } else {
        await tx.delete(vote).where(eq(vote.chatId, id));
      }

      await tx.delete(message).where(eq(message.chatId, id));
      await tx.delete(stream).where(eq(stream.chatId, id));

      const [chatsDeleted] = await tx
        .delete(chat)
        .where(eq(chat.id, id))
        .returning();
      return chatsDeleted;
    });
  } catch (error) {
    console.error('[deleteChatById] DB error for chat', id, error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<InferInsertModel<typeof message>>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

// Regenerate assistant message using versioning
export async function regenerateAssistantMessage({
  chatId,
  previousMessageId,
  newParts,
  newAttachments,
}: {
  chatId: string;
  previousMessageId: string;
  newParts: any;
  newAttachments: any;
}) {
  try {
    // Fetch previous message
    const [prev] = await db
      .select()
      .from(message)
      .where(and(eq(message.id, previousMessageId), eq(message.chatId, chatId)))
      .limit(1);

    if (!prev) {
      throw new ChatSDKError('not_found:database', 'Previous message not found');
    }

    // Mark previous inactive and set supersededAt
    await db
      .update(message)
      .set({ isActive: false, supersededAt: new Date() })
      .where(eq(message.id, previousMessageId));

    // Determine parent and next version
    const parentMessageId = prev.parentMessageId ?? prev.id;
    const nextVersion = (prev.version ?? 1) + 1;

    // Insert new message as next version
    const newId = generateUUID();
    await db.insert(message).values({
      id: newId,
      chatId,
      role: 'assistant',
      parts: newParts,
      attachments: newAttachments ?? [],
      createdAt: new Date(),
      parentMessageId,
      version: nextVersion,
      isActive: true,
      supersededAt: null,
    } as any);

    return { newMessageId: newId, parentMessageId, version: nextVersion };
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to regenerate assistant message');
  }
}

export async function getActiveMessagesByChatId({ chatId }: { chatId: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(and(eq(message.chatId, chatId), eq(message.isActive, true)))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get active messages');
  }
}

export async function getMessageVersionHistory({ parentMessageId }: { parentMessageId: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(
        or(
          eq(message.parentMessageId, parentMessageId),
          eq(message.id, parentMessageId),
        ) as any,
      )
      .orderBy(asc(message.version));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message version history');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(and(eq(message.chatId, id), eq(message.isActive, true)))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('[getMessagesByChatId] DB error for chat', id, error);
    // Fail soft so UI still loads after chat rename
    return [] as any;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  // Retry mechanism for race condition with message saving
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // First, verify that the message exists
      const [messageExists] = await db
        .select({ id: message.id })
        .from(message)
        .where(and(eq(message.id, messageId), eq(message.chatId, chatId)));

      if (!messageExists) {
        if (attempt < maxRetries) {
          console.log(`Message not found (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms: messageId=${messageId}, chatId=${chatId}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        } else {
          console.error(`Message not found after ${maxRetries} attempts: messageId=${messageId}, chatId=${chatId}`);
          throw new ChatSDKError('not_found:database', 'Message not found');
        }
      }

      const [existingVote] = await db
        .select()
        .from(vote)
        .where(and(eq(vote.messageId, messageId)));

      if (existingVote) {
        // Try to update with new schema first, fallback to old schema
        try {
          return await db
            .update(vote)
            .set({ 
              isUpvoted: type === 'up',
              updatedAt: new Date()
            })
            .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
        } catch (schemaError) {
          // Fallback to old schema without timestamps
          return await db
            .update(vote)
            .set({ isUpvoted: type === 'up' })
            .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
        }
      }
      
      // Try to insert with new schema first, fallback to old schema
      try {
        return await db.insert(vote).values({
          chatId,
          messageId,
          isUpvoted: type === 'up',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (schemaError) {
        // Fallback to old schema without timestamps
        return await db.insert(vote).values({
          chatId,
          messageId,
          isUpvoted: type === 'up',
        });
      }
    } catch (error) {
      console.error(`Error in voteMessage (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt === maxRetries) {
        if (error instanceof ChatSDKError) {
          throw error;
        }
        throw new ChatSDKError('bad_request:database', 'Failed to vote message');
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  content,
  userId,
}: {
  id: string;
  title: string;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        content,
        userId,
        text: 'text',
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessageById({ id }: { id: string }) {
  try {
    const result = await db
      .delete(message)
      .where(eq(message.id, id))
      .returning({ id: message.id });

    console.log(`[deleteMessageById] Deleted message with id: ${id}`);
    return result;
  } catch (error) {
    console.error(`[deleteMessageById] Error deleting message ${id}:`, error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat title by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

// Enhanced feedback system functions
export async function saveResponseFeedback({
  chatId,
  messageId,
  userId,
  voteType,
  qualityScore,
  helpfulnessScore,
  accuracyScore,
  clarityScore,
  downvoteReason,
  customFeedback,
  responseTime,
}: {
  chatId: string;
  messageId: string;
  userId: string;
  voteType: 'up' | 'down' | 'neutral';
  qualityScore?: number;
  helpfulnessScore?: number;
  accuracyScore?: number;
  clarityScore?: number;
  downvoteReason?: 'inaccurate' | 'unhelpful' | 'inappropriate' | 'too_long' | 'too_short' | 'off_topic' | 'other';
  customFeedback?: string;
  responseTime?: number;
}) {
  try {
    // Ensure the message exists (race-condition safe)
    const maxRetries = 3;
    const retryDelayMs = 400;
    let found = false;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const [msg] = await db
        .select({ id: message.id })
        .from(message)
        .where(and(eq(message.id, messageId), eq(message.chatId, chatId)))
        .limit(1);
      if (msg) { found = true; break; }
      if (attempt < maxRetries) {
        console.log(`[saveResponseFeedback] message not yet persisted, retrying ${attempt}/${maxRetries}`);
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
    if (!found) {
      console.error('[saveResponseFeedback] Message not found for feedback', { chatId, messageId });
      throw new ChatSDKError('not_found:database', 'Message not found for feedback');
    }
    console.log('[saveResponseFeedback] input', {
      chatId,
      messageId,
      userId,
      voteType,
      qualityScore,
      helpfulnessScore,
      accuracyScore,
      clarityScore,
      downvoteReason,
      hasCustomFeedback: Boolean(customFeedback && customFeedback.length > 0),
      responseTime,
    });
    // Check if feedback already exists
    const [existingFeedback] = await db
      .select()
      .from(responseFeedback)
      .where(and(eq(responseFeedback.userId, userId), eq(responseFeedback.messageId, messageId)));

    if (existingFeedback) {
      // Update existing feedback
      console.log('[saveResponseFeedback] updating existing feedback id', existingFeedback.id);
      return await db
        .update(responseFeedback)
        .set({
          voteType,
          qualityScore,
          helpfulnessScore,
          accuracyScore,
          clarityScore,
          downvoteReason,
          customFeedback,
          responseTime,
          createdAt: new Date(),
        })
        .where(and(eq(responseFeedback.userId, userId), eq(responseFeedback.messageId, messageId)));
    } else {
      // Create new feedback
      console.log('[saveResponseFeedback] inserting new feedback');
      return await db.insert(responseFeedback).values({
        chatId,
        messageId,
        userId,
        voteType,
        qualityScore,
        helpfulnessScore,
        accuracyScore,
        clarityScore,
        downvoteReason,
        customFeedback,
        responseTime,
      });
    }
  } catch (error) {
    console.error('[saveResponseFeedback] error', error);
    throw new ChatSDKError('bad_request:database', 'Failed to save response feedback');
  }
}

export async function getResponseFeedbackByMessageId({ messageId }: { messageId: string }) {
  try {
    return await db
      .select()
      .from(responseFeedback)
      .where(eq(responseFeedback.messageId, messageId));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get response feedback');
  }
}

export async function getUserPreferences({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .orderBy(desc(userPreferences.confidence));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user preferences');
  }
}

export async function updateUserPreference({
  userId,
  preferenceType,
  preferenceValue,
  confidence,
}: {
  userId: string;
  preferenceType: 'response_style' | 'detail_level' | 'tone' | 'format' | 'topic_expertise';
  preferenceValue: string;
  confidence: number;
}) {
  try {
    const [existingPreference] = await db
      .select()
      .from(userPreferences)
      .where(and(
        eq(userPreferences.userId, userId),
        eq(userPreferences.preferenceType, preferenceType),
        eq(userPreferences.preferenceValue, preferenceValue)
      ));

    if (existingPreference) {
      // Update existing preference with weighted average
      const newConfidence = Math.min(1, existingPreference.confidence + (confidence * 0.1));
      const newEvidenceCount = existingPreference.evidenceCount + 1;
      
      return await db
        .update(userPreferences)
        .set({
          confidence: newConfidence,
          evidenceCount: newEvidenceCount,
          lastUpdated: new Date(),
        })
        .where(eq(userPreferences.id, existingPreference.id));
    } else {
      // Create new preference
      return await db.insert(userPreferences).values({
        userId,
        preferenceType,
        preferenceValue,
        confidence,
        evidenceCount: 1,
      });
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update user preference');
  }
}

export async function saveResponseAnalytics({
  messageId,
  model,
  promptTokens,
  completionTokens,
  totalTokens,
  responseTime,
}: {
  messageId: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  responseTime?: number;
}) {
  try {
    return await db.insert(responseAnalytics).values({
      messageId,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      responseTime,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save response analytics');
  }
}

export async function updateResponseAnalytics({
  messageId,
  averageQualityScore,
  totalVotes,
  upvotes,
  downvotes,
}: {
  messageId: string;
  averageQualityScore?: number;
  totalVotes?: number;
  upvotes?: number;
  downvotes?: number;
}) {
  try {
    const [existingAnalytics] = await db
      .select()
      .from(responseAnalytics)
      .where(eq(responseAnalytics.messageId, messageId));

    if (existingAnalytics) {
      return await db
        .update(responseAnalytics)
        .set({
          averageQualityScore,
          totalVotes: totalVotes ?? existingAnalytics.totalVotes,
          upvotes: upvotes ?? existingAnalytics.upvotes,
          downvotes: downvotes ?? existingAnalytics.downvotes,
        })
        .where(eq(responseAnalytics.messageId, messageId));
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update response analytics');
  }
}

export async function getResponseQualityMetrics({
  userId,
  limit = 100,
}: {
  userId?: string;
  limit?: number;
}) {
  try {
    // Base select
    let base = db
      .select({
        messageId: responseAnalytics.messageId,
        model: responseAnalytics.model,
        averageQualityScore: responseAnalytics.averageQualityScore,
        totalVotes: responseAnalytics.totalVotes,
        upvotes: responseAnalytics.upvotes,
        downvotes: responseAnalytics.downvotes,
        responseTime: responseAnalytics.responseTime,
        createdAt: responseAnalytics.createdAt,
      })
      .from(responseAnalytics)
      .orderBy(desc(responseAnalytics.createdAt))
      .limit(limit);

    // If filtering by user, join via Message_v2 -> Chat
    if (userId) {
      base = db
        .select({
          messageId: responseAnalytics.messageId,
          model: responseAnalytics.model,
          averageQualityScore: responseAnalytics.averageQualityScore,
          totalVotes: responseAnalytics.totalVotes,
          upvotes: responseAnalytics.upvotes,
          downvotes: responseAnalytics.downvotes,
          responseTime: responseAnalytics.responseTime,
          createdAt: responseAnalytics.createdAt,
        })
        .from(responseAnalytics)
        .innerJoin(message, eq(responseAnalytics.messageId, message.id))
        .innerJoin(chat, eq(message.chatId, chat.id))
        .where(eq(chat.userId, userId))
        .orderBy(desc(responseAnalytics.createdAt))
        .limit(limit) as any;
    }

    return await base.execute();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get response quality metrics');
  }
}
