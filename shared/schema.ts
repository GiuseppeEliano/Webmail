import { mysqlTable, text, int, boolean, timestamp, varchar, bigint, json, tinyint } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - baseado na estrutura real do MySQL
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  profilePicture: varchar("profilePicture", { length: 500 }),
  signature: text("signature"),
  storageUsed: bigint("storageUsed", { mode: "number" }).default(0),
  storageQuota: bigint("storageQuota", { mode: "number" }).default(104857600),
  language: varchar("language", { length: 10 }).default("pt"),
  theme: varchar("theme", { length: 20 }).default("dark"),
  avatarShape: varchar("avatarShape", { length: 20 }).default("rounded"),
  sidebarView: varchar("sidebarView", { length: 20 }).default("expanded"),
  emailsPerPage: int("emailsPerPage").default(20),
  stayLoggedIn: tinyint("stayLoggedIn").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Aliases table - baseado na estrutura real do MySQL
export const aliases = mysqlTable("aliases", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  aliasName: varchar("aliasName", { length: 100 }).notNull().unique(),
  forwardTo: varchar("forwardTo", { length: 255 }).notNull(),
  isActive: tinyint("isActive").default(1),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Emails table - baseado na estrutura real do MySQL
export const emails = mysqlTable("emails", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  folderId: int("folderId").notNull(),
  messageId: varchar("messageId", { length: 255 }).unique(),
  threadId: varchar("threadId", { length: 255 }),
  fromAddress: varchar("fromAddress", { length: 255 }).notNull(),
  fromName: varchar("fromName", { length: 255 }),
  toAddress: text("toAddress").notNull(),
  ccAddress: text("ccAddress"),
  bccAddress: text("bccAddress"),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  attachments: json("attachments"),
  isRead: tinyint("isRead").default(0),
  isStarred: tinyint("isStarred").default(0),
  isDraft: tinyint("isDraft").default(0),
  isActiveDraft: tinyint("isActiveDraft").default(0),
  priority: varchar("priority", { length: 20 }).default("normal"), // enum('low','normal','high')
  sentAt: timestamp("sentAt"),
  receivedAt: timestamp("receivedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Email tags junction table - baseado na estrutura real do MySQL
export const emailTags = mysqlTable("email_tags", {
  id: int("id").primaryKey().autoincrement(),
  emailId: int("emailId").notNull(),
  tagId: int("tagId").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Folders table - baseado na estrutura real do MySQL
export const folders = mysqlTable("folders", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).default("custom"), // enum('system','custom')
  systemType: varchar("systemType", { length: 50 }),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Sessions table - baseado na estrutura real do MySQL
export const sessions = mysqlTable("sessions", {
  sid: varchar("sid", { length: 36 }).primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Tags table - baseado na estrutura real do MySQL
export const tags = mysqlTable("tags", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 7 }).default("#3b82f6"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Blocked senders table - para funcionalidade de bloquear remetente
export const blockedSenders = mysqlTable("blocked_senders", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  blockedEmail: varchar("blockedEmail", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Insert schemas
const baseInsertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Email inválido").refine(
    (email) => email.endsWith("@eliano.dev"),
    "Email deve terminar com @eliano.dev"
  ),
  firstName: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  lastName: z.string().min(1, "Sobrenome é obrigatório").max(100, "Sobrenome deve ter no máximo 100 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(255),
});

export const insertUserSchema = baseInsertUserSchema.transform((data) => ({
  ...data,
  // Convert boolean values to numbers for MySQL tinyint compatibility
  stayLoggedIn: typeof data.stayLoggedIn === 'boolean' ? (data.stayLoggedIn ? 1 : 0) : data.stayLoggedIn,
}));

export const insertFolderSchema = createInsertSchema(folders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1).max(100, "Nome deve ter no máximo 100 caracteres"),
});

const baseInsertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailSchema = baseInsertEmailSchema.transform((data) => ({
  ...data,
  // transform rules
}));

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1).max(50, "Nome deve ter no máximo 50 caracteres"),
});

export const insertEmailTagSchema = createInsertSchema(emailTags).omit({
  id: true,
  createdAt: true,
});

const baseInsertAliasSchema = createInsertSchema(aliases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  aliasName: z.string().min(1, "Nome da alias é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  forwardTo: z.string().email("Email de destino inválido"),
});

export const insertAliasSchema = baseInsertAliasSchema.transform((data) => ({
  ...data,
  // Convert boolean values to numbers for MySQL tinyint compatibility
  isActive: typeof data.isActive === 'boolean' ? (data.isActive ? 1 : 0) : data.isActive,
}));

export const insertBlockedSenderSchema = createInsertSchema(blockedSenders).omit({
  id: true,
  createdAt: true,
}).extend({
  blockedEmail: z.string().email("Email inválido"),
  emailId: z.number().optional(), // Optional field for the email that triggered the block
});

// Update schemas
export const updateUserSchema = baseInsertUserSchema.partial();
export const updateEmailSchema = baseInsertEmailSchema.partial();
export const updateFolderSchema = insertFolderSchema.partial();
export const updateTagSchema = insertTagSchema.partial();
export const updateAliasSchema = baseInsertAliasSchema.partial();

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type InsertEmailTag = z.infer<typeof insertEmailTagSchema>;
export type InsertAlias = z.infer<typeof insertAliasSchema>;
export type InsertBlockedSender = z.infer<typeof insertBlockedSenderSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateEmail = z.infer<typeof updateEmailSchema>;
export type UpdateFolder = z.infer<typeof updateFolderSchema>;
export type UpdateTag = z.infer<typeof updateTagSchema>;
export type UpdateAlias = z.infer<typeof updateAliasSchema>;

// Authentication schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  stayLoggedIn: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido").refine(
    (email) => email.endsWith("@eliano.dev"),
    "Email deve terminar com @eliano.dev"
  ),
  firstName: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  lastName: z.string().min(1, "Sobrenome é obrigatório").max(100, "Sobrenome deve ter no máximo 100 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(255),
  captcha: z.string().min(1, "Captcha é obrigatório"),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

// Select types
export type User = typeof users.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type EmailTag = typeof emailTags.$inferSelect;
export type Alias = typeof aliases.$inferSelect;
export type BlockedSender = typeof blockedSenders.$inferSelect;
export type Session = typeof sessions.$inferSelect;