"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderInputIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { type DBChat, type DBFolder } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Sidebar({
  initialChats = [],
  initialFolders = [],
}: {
  initialChats?: DBChat[]
  initialFolders?: DBFolder[]
}) {
  const [chats, setChats] = React.useState<DBChat[]>(initialChats)
  const [folders, setFolders] = React.useState<DBFolder[]>(initialFolders)
  const [openFolders, setOpenFolders] = React.useState<Record<string, boolean>>({})

  // Inline editing states
  const [editingChatId, setEditingChatId] = React.useState<string | null>(null)
  const [editingChatTitle, setEditingChatTitle] = React.useState("")

  const [editingFolderId, setEditingFolderId] = React.useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = React.useState("")

  const [isCreatingFolder, setIsCreatingFolder] = React.useState(false)
  const [newFolderName, setNewFolderName] = React.useState("")

  const [movingChat, setMovingChat] = React.useState<DBChat | null>(null)

  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    setChats(initialChats)
  }, [initialChats])

  React.useEffect(() => {
    setFolders(initialFolders)
  }, [initialFolders])

  // Open all folders by default initially
  React.useEffect(() => {
    setOpenFolders((prev) => {
      const updated = { ...prev }
      folders.forEach((f) => {
        if (updated[f.id] === undefined) {
          updated[f.id] = true
        }
      })
      return updated
    })
  }, [folders])

  React.useEffect(() => {
    const handleChatCreated = (e: Event) => {
      const customEvent = e as CustomEvent<DBChat>
      if (!customEvent.detail) return
      setChats((prev) => {
        if (prev.some((c) => c.id === customEvent.detail.id)) return prev
        return [customEvent.detail, ...prev]
      })
    }

    const handleChatUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{
        id: string
        title?: string
        folder_id?: string | null
      }>
      if (!customEvent.detail) return
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== customEvent.detail.id) return c
          return {
            ...c,
            ...(customEvent.detail.title !== undefined && {
              title: customEvent.detail.title,
            }),
            ...(customEvent.detail.folder_id !== undefined && {
              folder_id: customEvent.detail.folder_id,
            }),
          }
        })
      )
    }

    const handleChatDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>
      if (!customEvent.detail) return
      setChats((prev) => prev.filter((c) => c.id !== customEvent.detail.id))
    }

    window.addEventListener("chat-created", handleChatCreated)
    window.addEventListener("chat-updated", handleChatUpdated)
    window.addEventListener("chat-deleted", handleChatDeleted)
    return () => {
      window.removeEventListener("chat-created", handleChatCreated)
      window.removeEventListener("chat-updated", handleChatUpdated)
      window.removeEventListener("chat-deleted", handleChatDeleted)
    }
  }, [])

  // Folder actions
  const handleCreateFolder = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const name = newFolderName.trim()
    if (!name) {
      setIsCreatingFolder(false)
      return
    }
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const data = (await res.json()) as { folder: DBFolder }
        setFolders((prev) => [...prev, data.folder])
        setOpenFolders((prev) => ({ ...prev, [data.folder.id]: true }))
      }
    } catch {
      // Ignore
    } finally {
      setIsCreatingFolder(false)
      setNewFolderName("")
    }
  }

  const handleRenameFolder = async (folderId: string) => {
    const name = editingFolderName.trim()
    if (!name) {
      setEditingFolderId(null)
      return
    }
    try {
      await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, name } : f))
      )
    } catch {
      // Ignore
    } finally {
      setEditingFolderId(null)
      setEditingFolderName("")
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await fetch(`/api/folders/${folderId}`, { method: "DELETE" })
      setFolders((prev) => prev.filter((f) => f.id !== folderId))
      setChats((prev) =>
        prev.map((c) => (c.folder_id === folderId ? { ...c, folder_id: null } : c))
      )
    } catch {
      // Ignore
    }
  }

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }))
  }

  // Chat actions
  const handleRenameChat = async (chatId: string) => {
    const title = editingChatTitle.trim()
    if (!title) {
      setEditingChatId(null)
      return
    }
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title } : c))
      )
      window.dispatchEvent(
        new CustomEvent("chat-updated", { detail: { id: chatId, title } })
      )
    } catch {
      // Ignore
    } finally {
      setEditingChatId(null)
      setEditingChatTitle("")
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" })
      setChats((prev) => prev.filter((c) => c.id !== chatId))
      window.dispatchEvent(
        new CustomEvent("chat-deleted", { detail: { id: chatId } })
      )
      if (pathname === `/chat/${chatId}`) {
        router.push("/")
      }
    } catch {
      // Ignore
    }
  }

  const handleMoveChat = async (chatId: string, folderId: string | null) => {
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      })
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, folder_id: folderId } : c))
      )
    } catch {
      // Ignore
    } finally {
      setMovingChat(null)
    }
  }

  const unassignedChats = chats.filter((c) => !c.folder_id)

  return (
    <aside className="relative flex h-full w-64 shrink-0 flex-col border-r border-border bg-muted/30 select-none">
      {/* Action Buttons: New Chat & New Project */}
      <div className="flex gap-2 border-b border-border p-3">
        <Button
          variant="outline"
          className="flex-1 justify-start gap-2"
          render={<Link href="/" />}
          nativeButton={false}
        >
          <PlusIcon className="size-4 shrink-0" />
          <span className="truncate">New Chat</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="New Project / Folder"
          onClick={() => setIsCreatingFolder(true)}
        >
          <FolderPlusIcon className="size-4" />
        </Button>
      </div>

      {/* New Project Input */}
      {isCreatingFolder && (
        <form onSubmit={handleCreateFolder} className="border-b border-border p-2">
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              placeholder="Project name…"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <CheckIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* Navigation list */}
      <div className="flex-1 space-y-4 overflow-y-auto p-2">
        {/* Projects / Folders */}
        {folders.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 py-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Projects
            </div>

            {folders.map((folder) => {
              const isOpen = openFolders[folder.id] ?? true
              const folderChats = chats.filter((c) => c.folder_id === folder.id)
              const isEditing = editingFolderId === folder.id

              return (
                <div key={folder.id} className="space-y-1">
                  {isEditing ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameFolder(folder.id)
                          if (e.key === "Escape") setEditingFolderId(null)
                        }}
                        className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        onClick={() => handleRenameFolder(folder.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <CheckIcon className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingFolderId(null)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-accent/40">
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left text-muted-foreground transition-colors group-hover:text-foreground"
                      >
                        {isOpen ? (
                          <ChevronDownIcon className="size-3.5 shrink-0" />
                        ) : (
                          <ChevronRightIcon className="size-3.5 shrink-0" />
                        )}
                        {isOpen ? (
                          <FolderOpenIcon className="size-4 shrink-0 text-primary/80" />
                        ) : (
                          <FolderIcon className="size-4 shrink-0 text-primary/80" />
                        )}
                        <span className="truncate font-medium">{folder.name}</span>
                        <span className="text-xs text-muted-foreground/60">
                          ({folderChats.length})
                        </span>
                      </button>

                      {/* Folder action buttons */}
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title="Rename Project"
                          onClick={() => {
                            setEditingFolderId(folder.id)
                            setEditingFolderName(folder.name)
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <PencilIcon className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete Project"
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chats inside this folder */}
                  {isOpen && (
                    <div className="ml-4 space-y-0.5 border-l border-border/50 pl-2">
                      {folderChats.length === 0 ? (
                        <div className="px-2 py-1 text-xs text-muted-foreground/50">
                          Empty project
                        </div>
                      ) : (
                        folderChats.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            pathname={pathname}
                            isEditing={editingChatId === chat.id}
                            editingTitle={editingChatTitle}
                            onStartEdit={() => {
                              setEditingChatId(chat.id)
                              setEditingChatTitle(chat.title)
                            }}
                            onCancelEdit={() => setEditingChatId(null)}
                            onSaveEdit={() => handleRenameChat(chat.id)}
                            onTitleChange={setEditingChatTitle}
                            onDelete={() => handleDeleteChat(chat.id)}
                            onMove={() => setMovingChat(chat)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Recent / Unassigned Chats */}
        <div className="space-y-1">
          <div className="px-2 py-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {folders.length > 0 ? "Other Chats" : "Recent Chats"}
          </div>

          {unassignedChats.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              {chats.length === 0 ? "No chats yet." : "No unorganized chats."}
            </div>
          ) : (
            unassignedChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                pathname={pathname}
                isEditing={editingChatId === chat.id}
                editingTitle={editingChatTitle}
                onStartEdit={() => {
                  setEditingChatId(chat.id)
                  setEditingChatTitle(chat.title)
                }}
                onCancelEdit={() => setEditingChatId(null)}
                onSaveEdit={() => handleRenameChat(chat.id)}
                onTitleChange={setEditingChatTitle}
                onDelete={() => handleDeleteChat(chat.id)}
                onMove={() => setMovingChat(chat)}
              />
            ))
          )}
        </div>
      </div>

      {/* Move Chat Modal */}
      {movingChat && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xs space-y-3 rounded-xl border border-border bg-card p-4 shadow-xl">
            <div className="text-sm font-semibold text-foreground">
              Move &ldquo;{movingChat.title}&rdquo; to:
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              <button
                onClick={() => handleMoveChat(movingChat.id, null)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left hover:bg-accent",
                  !movingChat.folder_id && "bg-accent/80 font-medium"
                )}
              >
                <MessageSquareIcon className="size-3.5" />
                Root (No Project)
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleMoveChat(movingChat.id, f.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left hover:bg-accent",
                    movingChat.folder_id === f.id && "bg-accent/80 font-medium"
                  )}
                >
                  <FolderIcon className="size-3.5 text-primary/80" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMovingChat(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function ChatItem({
  chat,
  pathname,
  isEditing,
  editingTitle,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onTitleChange,
  onDelete,
  onMove,
}: {
  chat: DBChat
  pathname: string
  isEditing: boolean
  editingTitle: string
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onTitleChange: (v: string) => void
  onDelete: () => void
  onMove: () => void
}) {
  const isActive = pathname === `/chat/${chat.id}`

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <input
          type="text"
          autoFocus
          value={editingTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEdit()
            if (e.key === "Escape") onCancelEdit()
          }}
          className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={onSaveEdit}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <CheckIcon className="size-3.5" />
        </button>
        <button
          onClick={onCancelEdit}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-accent font-medium text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
      )}
    >
      <Link
        href={`/chat/${chat.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 truncate"
      >
        <MessageSquareIcon className="size-3.5 shrink-0" />
        <span className="truncate">{chat.title || "Untitled Chat"}</span>
      </Link>

      {/* Chat hover / active actions */}
      <div
        className={cn(
          "flex items-center gap-0.5 transition-opacity",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <button
          type="button"
          title="Move to project"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onMove()
          }}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <FolderInputIcon className="size-3.5" />
        </button>
        <button
          type="button"
          title="Rename chat"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onStartEdit()
          }}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PencilIcon className="size-3.5" />
        </button>
        <button
          type="button"
          title="Delete chat"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete()
          }}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
