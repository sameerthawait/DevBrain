import { pgTable, uuid, varchar, timestamp, integer, text, jsonb, numeric, index, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { vector } from "drizzle-orm/pg-core";

// 1. Users Table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  monthlyTokenUsage: integer("monthly_token_usage").default(0).notNull(),
  tokenLimit: integer("token_limit").default(10000000).notNull(),
});

// 2. User Sessions Table
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// 3. Documents Table (Source code or technical docs)
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  filename: varchar("filename", { length: 512 }).notNull(),
  filePath: varchar("file_path", { length: 1024 }).notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Chunks Table (AST / Semantic chunks with Vector representations)
export const chunks = pgTable("chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  tokensCount: integer("tokens_count").notNull(),
  embedding: vector("embedding", { dimensions: 768 }).notNull(),
  metadata: jsonb("metadata").notNull(), // contains file line ranges, functional signatures, dependencies
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("chunks_document_id_idx").on(table.documentId),
  index("chunks_embedding_cosine_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);

// 5. Conversations Table (Sessions)
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).default("New Conversation").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. Messages Table (Individual messages in threads)
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  sender: varchar("sender", { length: 50 }).notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  citations: jsonb("citations"), // array of chunk references used to generate response
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. User Memories Table (Structured semantic facts extracted over time)
export const userMemories = pgTable("user_memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'working', 'short_term', 'long_term', 'decision', 'archived'
  factContent: text("fact_content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }).notNull(),
  metadata: jsonb("metadata").notNull(), // source metadata, decay rate parameters, recall counts
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_memories_lookup_idx").on(table.userId, table.type),
  index("user_memories_embedding_cosine_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);

// 8. NLI Contradiction Matrix Results Cache
export const nliResults = pgTable("nli_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }).notNull(),
  claimA: text("claim_a").notNull(),
  claimB: text("claim_b").notNull(),
  verdict: varchar("verdict", { length: 50 }).notNull(), // 'entailment', 'contradiction', 'neutral'
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9. Conflict Feedback Table (User feedback on detected conflicts)
export const conflictFeedback = pgTable("conflict_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }).notNull(),
  isHelpful: boolean("is_helpful").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Relations Definitions ---

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(userSessions),
  documents: many(documents),
  conversations: many(conversations),
  memories: many(userMemories),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, { fields: [chunks.documentId], references: [documents.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  nliResults: many(nliResults),
  feedbacks: many(conflictFeedback),
}));

export const userMemoriesRelations = relations(userMemories, ({ one }) => ({
  user: one(users, { fields: [userMemories.userId], references: [users.id] }),
}));

export const nliResultsRelations = relations(nliResults, ({ one }) => ({
  message: one(messages, { fields: [nliResults.messageId], references: [messages.id] }),
}));

export const conflictFeedbackRelations = relations(conflictFeedback, ({ one }) => ({
  message: one(messages, { fields: [conflictFeedback.messageId], references: [messages.id] }),
}));
