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

// Define chat type enum
export const chatTypeEnum = pgEnum('chat_type', [
  'general',
  'lesson',
  'instructor',
]);

export const chat = pgTable(
  'Chat',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    visibility: varchar('visibility', { enum: ['public', 'private'] })
      .notNull()
      .default('private'),
    chatType: chatTypeEnum('chat_type').notNull().default('general'), // distinguish chat types
    lessonId: uuid('lessonId').references(() => topicLesson.id), // nullable, for lesson chats
    topicId: uuid('topicId').references(() => topic.id), // nullable, associate chat to a topic
    moduleId: uuid('moduleId').references(() => topicModule.id), // nullable, associate chat to a module
  },
  (table) => ({
    uniqueUserLesson: unique('unique_user_lesson_chat').on(
      table.userId,
      table.lessonId,
    ),
  }),
);

export type Chat = InferSelectModel<typeof chat>;

export const instructorNote = pgTable('InstructorNote', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type InstructorNote = InferSelectModel<typeof instructorNote>;

// Junction table to link instructor chats with sources
export const instructorChatSource = pgTable(
  'InstructorChatSource',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    sourceId: uuid('sourceId')
      .notNull()
      .references(() => instructorSource.id, { onDelete: 'cascade' }),
    addedAt: timestamp('addedAt').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.sourceId] }),
  }),
);

export type InstructorChatSource = InferSelectModel<
  typeof instructorChatSource
>;

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
    parentRef: foreignKey({
      columns: [table.parentMessageId],
      foreignColumns: [table.id],
    }),
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
      enum: [
        'inaccurate',
        'unhelpful',
        'inappropriate',
        'too_long',
        'too_short',
        'off_topic',
        'other',
      ],
    }),
    customFeedback: text('customFeedback'),
    responseTime: integer('responseTime'), // milliseconds
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => {
    return {
      uniqueUserMessage: unique('unique_user_message_feedback').on(
        table.userId,
        table.messageId,
      ),
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
      enum: [
        'response_style',
        'detail_level',
        'tone',
        'format',
        'topic_expertise',
      ],
    }).notNull(),
    preferenceValue: text('preferenceValue').notNull(),
    confidence: real('confidence').notNull().default(0.5), // 0-1 scale
    evidenceCount: integer('evidenceCount').notNull().default(1),
    lastUpdated: timestamp('lastUpdated').notNull().defaultNow(),
  },
  (table) => {
    return {
      uniqueUserPreference: unique('unique_user_preference').on(
        table.userId,
        table.preferenceType,
        table.preferenceValue,
      ),
    };
  },
);

export type UserPreferences = InferSelectModel<typeof userPreferences>;

// Response quality analytics
export const responseAnalytics = pgTable('ResponseAnalytics', {
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
});

export type ResponseAnalytics = InferSelectModel<typeof responseAnalytics>;

// Topics and learning progress
export const topic = pgTable(
  'Topic',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 64 }).notNull(),
    title: varchar('title', { length: 128 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 64 }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    uniqueSlug: unique('unique_topic_slug').on(table.slug),
  }),
);

export type Topic = InferSelectModel<typeof topic>;

export const userTopicProgress = pgTable(
  'UserTopicProgress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    topicId: uuid('topicId')
      .notNull()
      .references(() => topic.id),
    progress: integer('progress').notNull().default(0), // 0-100
    lastAccessed: timestamp('lastAccessed').notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserTopic: unique('unique_user_topic').on(
      table.userId,
      table.topicId,
    ),
  }),
);

export type UserTopicProgress = InferSelectModel<typeof userTopicProgress>;

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

export const topicModule = pgTable('TopicModule', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicId: uuid('topicId')
    .references(() => topic.id, { onDelete: 'cascade' })
    .notNull(),
  order: integer('order').notNull(),
  title: varchar('title', { length: 128 }).notNull(),
  description: text('description'),
  learningObjectives: text('learningObjectives').array(), // TEXT[] tương đương
  // New columns added in migration: difficulty and estimated_hours
  difficulty: varchar('difficulty', { length: 32 }).default('Beginner'),
  estimated_hours: integer('estimated_hours').default(2),
});

export type TopicModule = InferSelectModel<typeof topicModule>;

// Track per-user lesson completion/progress
// NOTE: Underlying DB columns use snake_case. We map them here while keeping
// camelCase property names for TypeScript usage across queries.
export const lessonProgress = pgTable(
  'LessonProgress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // DB column: user_id
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    // DB column: lesson_id
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => topicLesson.id),
    // DB column: completed_at
    completedAt: timestamp('completed_at'),
    // DB column: last_accessed_at
    lastAccessedAt: timestamp('last_accessed_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserLesson: unique('unique_user_lesson').on(
      table.userId,
      table.lessonId,
    ),
  }),
);

export type LessonProgress = InferSelectModel<typeof lessonProgress>;

// Track per-user module completion/progress
// Map snake_case DB columns for module progress as well.
export const moduleProgress = pgTable(
  'ModuleProgress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // DB column: user_id
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    // DB column: module_id
    moduleId: uuid('module_id')
      .notNull()
      .references(() => topicModule.id),
    // DB column: completed_at
    completedAt: timestamp('completed_at'),
    // DB column: last_accessed_at
    lastAccessedAt: timestamp('last_accessed_at').notNull().defaultNow(),
    // DB column: completion_percentage
    completionPercentage: integer('completion_percentage').notNull().default(0),
  },
  (table) => ({
    uniqueUserModule: unique('unique_user_module').on(
      table.userId,
      table.moduleId,
    ),
  }),
);

export type ModuleProgress = InferSelectModel<typeof moduleProgress>;

export const lessonTypeEnum = pgEnum('lesson_type', [
  'introduction',
  'theory',
  'exercise',
  'practice',
  'project',
  'quiz',
]);

export const topicLesson = pgTable('TopicLesson', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('moduleId')
    .references(() => topicModule.id, { onDelete: 'cascade' })
    .notNull(),
  order: integer('order').notNull(),
  title: varchar('title', { length: 128 }).notNull(),
  type: lessonTypeEnum('type').notNull(),
  content: text('content'),
  exercisePrompt: text('exercisePrompt'),
  projectBrief: text('projectBrief'),
  estimatedMinutes: integer('estimatedMinutes'),
  starterCode: text('starterCode'),
  language: varchar('language', { length: 32 }),
  tests: json('tests'),
});

export type TopicLesson = InferSelectModel<typeof topicLesson>;

// Instructor sources for teaching materials
export const sourceTypeEnum = pgEnum('source_type', [
  'markdown',
  'code',
  'pdf',
  'image',
]);

export const instructorSource = pgTable('InstructorSource', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  excerpt: text('excerpt'),
  content: text('content'),
  sourceUrl: text('sourceUrl'),
  metadata: json('metadata'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type InstructorSource = InferSelectModel<typeof instructorSource>;

// Document chunks for RAG (vector storage)
export const documentChunk = pgTable('DocumentChunk', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('sourceId')
    .notNull()
    .references(() => instructorSource.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunkIndex').notNull(),
  content: text('content').notNull(),
  // Using a simple JSON array to store embedding (pgvector not always available)
  embedding: text('embedding').notNull(), // JSON stringified array
  tokenCount: integer('tokenCount').notNull(),
  metadata: json('metadata'), // page number, section, etc.
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type DocumentChunk = InferSelectModel<typeof documentChunk>;
