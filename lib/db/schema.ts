import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  pgEnum,
  integer,
  real,
  unique,
} from 'drizzle-orm/pg-core';

// Define the user_type enum
export const userTypeEnum = pgEnum('user_type', ['guest', 'regular']);

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
  type: userTypeEnum('type').default('guest'),
  displayName: varchar('displayName', { length: 100 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable(
  'Message_v2',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    role: varchar('role').notNull(),
    parts: json('parts').notNull(),
    attachments: json('attachments').notNull(),
    createdAt: timestamp('createdAt').notNull(),
    parentMessageId: uuid('parentMessageId'),
    version: integer('version').notNull().default(1),
    isActive: boolean('isActive').notNull().default(true),
    supersededAt: timestamp('supersededAt'),
  },
  (table) => ({
    parentRef: foreignKey({ columns: [table.parentMessageId], foreignColumns: [table.id] }),
  }),
);

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

// Enhanced feedback system
export const responseFeedback = pgTable(
  'ResponseFeedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    voteType: text('voteType', { enum: ['up', 'down', 'neutral'] }).notNull(),
    qualityScore: integer('qualityScore'), // 1-10 scale
    helpfulnessScore: integer('helpfulnessScore'), // 1-10 scale
    accuracyScore: integer('accuracyScore'), // 1-10 scale
    clarityScore: integer('clarityScore'), // 1-10 scale
    downvoteReason: text('downvoteReason', { 
      enum: ['inaccurate', 'unhelpful', 'inappropriate', 'too_long', 'too_short', 'off_topic', 'other'] 
    }),
    customFeedback: text('customFeedback'),
    responseTime: integer('responseTime'), // milliseconds
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => {
    return {
      uniqueUserMessage: unique('unique_user_message_feedback').on(table.userId, table.messageId),
    };
  },
);

export type ResponseFeedback = InferSelectModel<typeof responseFeedback>;

// User preference learning
export const userPreferences = pgTable(
  'UserPreferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    preferenceType: text('preferenceType', { 
      enum: ['response_style', 'detail_level', 'tone', 'format', 'topic_expertise'] 
    }).notNull(),
    preferenceValue: text('preferenceValue').notNull(),
    confidence: real('confidence').notNull().default(0.5), // 0-1 scale
    evidenceCount: integer('evidenceCount').notNull().default(1),
    lastUpdated: timestamp('lastUpdated').notNull().defaultNow(),
  },
  (table) => {
    return {
      uniqueUserPreference: unique('unique_user_preference').on(table.userId, table.preferenceType, table.preferenceValue),
    };
  },
);

export type UserPreferences = InferSelectModel<typeof userPreferences>;

// Response quality analytics
export const responseAnalytics = pgTable(
  'ResponseAnalytics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    model: text('model').notNull(),
    promptTokens: integer('promptTokens'),
    completionTokens: integer('completionTokens'),
    totalTokens: integer('totalTokens'),
    responseTime: integer('responseTime'), // milliseconds
    averageQualityScore: real('averageQualityScore'),
    totalVotes: integer('totalVotes').notNull().default(0),
    upvotes: integer('upvotes').notNull().default(0),
    downvotes: integer('downvotes').notNull().default(0),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
);

export type ResponseAnalytics = InferSelectModel<typeof responseAnalytics>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    text: varchar('text').notNull().default('text'),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;
