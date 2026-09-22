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
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    folder_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
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

// Migration: add folder_id to chats if missing
try {
  const chatColumns = db.prepare("PRAGMA table_info(chats)").all() as {
    name: string
  }[]
  const hasFolderId = chatColumns.some((col) => col.name === "folder_id")
  if (!hasFolderId) {
    db.exec(
      "ALTER TABLE chats ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL;"
    )
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_chats_folder_id ON chats(folder_id);")
} catch {
  // Ignore migration error
}

// Self-healing migration: assign unique UUIDs to any legacy empty-id records
try {
  const emptyRows = db
    .prepare("SELECT rowid FROM messages WHERE id = '' OR id IS NULL")
    .all() as { rowid: number }[]
  for (const row of emptyRows) {
    db.prepare("UPDATE messages SET id = ? WHERE rowid = ?").run(
      crypto.randomUUID(),
      row.rowid
    )
  }
} catch {
  // Ignore migration error
}

// Self-healing migration: clean up empty assistant messages saved during previous crashes
try {
  db.prepare(
    "DELETE FROM messages WHERE role = 'assistant' AND (parts = '[]' OR parts = '' OR parts IS NULL)"
  ).run()
} catch {
  // Ignore migration error
}

export interface DBFolder {
  id: string
  name: string
  created_at: number
  updated_at: number
}

export interface DBChat {
  id: string
  title: string
  model: string
  folder_id?: string | null
  created_at: number
  updated_at: number
}

import { formatChatTitle } from "@/lib/utils"
export { formatChatTitle }

// Folder helper functions:
export function getAllFolders(): DBFolder[] {
  return db
    .prepare("SELECT * FROM folders ORDER BY name ASC")
    .all() as DBFolder[]
}

export function createFolder(name: string): DBFolder {
  const id = crypto.randomUUID()
  const now = Date.now()
  const clean = name.trim() || "New Project"
  db.prepare(
    "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run(id, clean, now, now)
  return { id, name: clean, created_at: now, updated_at: now }
}

export function renameFolder(id: string, name: string) {
  const clean = name.trim()
  if (!clean) return
  db.prepare("UPDATE folders SET name = ?, updated_at = ? WHERE id = ?").run(
    clean,
    Date.now(),
    id
  )
}

export function deleteFolder(id: string) {
  db.prepare("UPDATE chats SET folder_id = NULL WHERE folder_id = ?").run(id)
  db.prepare("DELETE FROM folders WHERE id = ?").run(id)
}

export function moveChatToFolder(chatId: string, folderId: string | null) {
  db.prepare("UPDATE chats SET folder_id = ?, updated_at = ? WHERE id = ?").run(
    folderId || null,
    Date.now(),
    chatId
  )
}

export function deleteChat(id: string) {
  db.prepare("DELETE FROM messages WHERE chat_id = ?").run(id)
  db.prepare("DELETE FROM chats WHERE id = ?").run(id)
}

export function truncateChatMessagesAfter(chatId: string, messageId: string) {
  const target = db
    .prepare("SELECT created_at FROM messages WHERE id = ? AND chat_id = ?")
    .get(messageId, chatId) as { created_at: number } | undefined

  if (target) {
    db.prepare(
      "DELETE FROM messages WHERE chat_id = ? AND created_at >= ?"
    ).run(chatId, target.created_at)
  }
}

// Database helper functions:
export function getOrCreateChat(
  id: string,
  model: string,
  firstMessageText?: string,
  folderId?: string | null
): DBChat {
  const existing = db.prepare("SELECT * FROM chats WHERE id = ?").get(id) as
    DBChat | undefined
  if (existing) return existing

  const now = Date.now()
  const title = formatChatTitle(firstMessageText)
  db.prepare(
    `
    INSERT INTO chats (id, title, model, folder_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(id, title, model, folderId ?? null, now, now)

  return {
    id,
    title,
    model,
    folder_id: folderId ?? null,
    created_at: now,
    updated_at: now,
  }
}

export function updateChatTitle(id: string, title: string) {
  const clean = title.replace(/["'\n]/g, "").trim()
  if (!clean) return
  db.prepare("UPDATE chats SET title = ?, updated_at = ? WHERE id = ?").run(
    clean,
    Date.now(),
    id
  )
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
    ORDER BY created_at ASC, rowid ASC
  `
    )
    .all(chatId) as {
    id: string
    role: string
    parts: string
    created_at: number
  }[]

  return rows
    .map((row) => {
      let parts: ChatUIMessage["parts"] = []
      try {
        parts = JSON.parse(row.parts)
      } catch {
        parts = [{ type: "text", text: "" }]
      }
      return {
        id: row.id,
        role: row.role as "user" | "assistant",
        parts,
      }
    })
    .filter((msg) => {
      // Exclude corrupted empty assistant messages
      if (msg.role === "assistant" && (!msg.parts || msg.parts.length === 0)) {
        return false
      }
      return true
    })
}

// Saves a batch of messages in a single transaction, preserving original timestamps & order
export function saveMessages(
  chatId: string,
  messages: Array<{ id?: string; role: string; parts: unknown }>
) {
  if (!messages || messages.length === 0) return

  const now = Date.now()
  const upsert = db.prepare(`
    INSERT INTO messages (id, chat_id, role, parts, created_at)
    VALUES (@id, @chatId, @role, @parts, @createdAt)
    ON CONFLICT(id) DO UPDATE SET
      parts = excluded.parts,
      role = excluded.role
  `)

  const insertBatch = db.transaction(
    (msgs: Array<{ id?: string; role: string; parts: unknown }>) => {
      msgs.forEach((msg, index) => {
        // Skip assistant messages with empty parts to avoid corrupting history
        const partsArray = Array.isArray(msg.parts) ? msg.parts : []
        if (msg.role === "assistant" && partsArray.length === 0) {
          return
        }

        const id =
          typeof msg.id === "string" && msg.id.trim().length > 0
            ? msg.id
            : crypto.randomUUID()

        upsert.run({
          id,
          chatId,
          role: msg.role,
          parts: JSON.stringify(msg.parts ?? []),
          createdAt: now + index, // Guarantees strict sequential order within the batch
        })
      })
      db.prepare("UPDATE chats SET updated_at = ? WHERE id = ?").run(
        now,
        chatId
      )
    }
  )

  insertBatch(messages)
}

export function saveMessage(
  chatId: string,
  message: { id?: string; role: string; parts: unknown }
) {
  saveMessages(chatId, [message])
}
