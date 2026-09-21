import Database from "better-sqlite3"
import path from "path"
import { type ChatUIMessage } from "@/tools"

// Global singleton to prevent multiple DB instances on Next.js hot reload
const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined
}

const dbPath = path.join(process.cwd(), "chat.db")
export const db = globalForDb.db ?? new Database(dbPath)

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db
}

// Initialize tables and pragmas
db.pragma("journal_mode = WAL") // Better concurrency and performance

db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,
    parts TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
`)

export interface DBChat {
  id: string
  title: string
  model: string
  created_at: number
  updated_at: number
}

// Database helper functions:
export function getOrCreateChat(
  id: string,
  model: string,
  firstMessageText?: string
): DBChat {
  const existing = db.prepare("SELECT * FROM chats WHERE id = ?").get(id) as
    DBChat | undefined
  if (existing) return existing

  const now = Date.now()
  const title = (firstMessageText?.slice(0, 40) || "New Chat").trim()
  db.prepare(
    `
    INSERT INTO chats (id, title, model, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(id, title, model, now, now)

  return { id, title, model, created_at: now, updated_at: now }
}

export function getAllChats(): DBChat[] {
  return db
    .prepare("SELECT * FROM chats ORDER BY updated_at DESC")
    .all() as DBChat[]
}

export function getChat(id: string): DBChat | undefined {
  return db.prepare("SELECT * FROM chats WHERE id = ?").get(id) as
    DBChat | undefined
}

export function getChatMessages(chatId: string): ChatUIMessage[] {
  const rows = db
    .prepare(
      `
    SELECT id, role, parts, created_at 
    FROM messages 
    WHERE chat_id = ? 
    ORDER BY created_at ASC
  `
    )
    .all(chatId) as {
    id: string
    role: string
    parts: string
    created_at: number
  }[]

  return rows.map((row) => ({
    id: row.id,
    role: row.role as "user" | "assistant",
    parts: JSON.parse(row.parts),
  }))
}

export function saveMessage(
  chatId: string,
  message: { id: string; role: string; parts: unknown }
) {
  const now = Date.now()
  db.prepare(
    `
    INSERT OR REPLACE INTO messages (id, chat_id, role, parts, created_at)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(message.id, chatId, message.role, JSON.stringify(message.parts), now)

  // Update chat updated_at
  db.prepare("UPDATE chats SET updated_at = ? WHERE id = ?").run(now, chatId)
}
