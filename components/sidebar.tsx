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
  MoreHorizontalIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { type DBChat, type DBFolder } from "@/lib/db"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  // Inline editing states
  const [editingChatId, setEditingChatId] = React.useState<string | null>(null)
  const [editingChatTitle, setEditingChatTitle] = React.useState("")

  const [editingFolderId, setEditingFolderId] = React.useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = React.useState("")

  const [isCreatingFolder, setIsCreatingFolder] = React.useState(false)
  const [newFolderName, setNewFolderName] = React.useState("")

  // Modal dialog states
  const [movingChat, setMovingChat] = React.useState<DBChat | null>(null)
  const [chatToDelete, setChatToDelete] = React.useState<DBChat | null>(null)
  const [folderToDelete, setFolderToDelete] = React.useState<DBFolder | null>(null)

  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed")
      if (saved !== null) {
        setIsCollapsed(saved === "true")
      }
    } catch {
      // Ignore
    }
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem("sidebar-collapsed", String(next))
      } catch {
        // Ignore
      }
      return next
    })
  }

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

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return
    const folderId = folderToDelete.id
    try {
      await fetch(`/api/folders/${folderId}`, { method: "DELETE" })
      setFolders((prev) => prev.filter((f) => f.id !== folderId))
      setChats((prev) =>
        prev.map((c) => (c.folder_id === folderId ? { ...c, folder_id: null } : c))
      )
    } catch {
      // Ignore
    } finally {
      setFolderToDelete(null)
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

  const handleConfirmDeleteChat = async () => {
    if (!chatToDelete) return
    const chatId = chatToDelete.id
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
    } finally {
      setChatToDelete(null)
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

  // ----------------------------------------------------
  // Collapsed Sidebar View
  // ----------------------------------------------------
  if (isCollapsed) {
    return (
      <aside className="relative flex h-full w-14 shrink-0 flex-col items-center border-r border-border bg-muted/20 py-3 transition-all duration-300 select-none">
        <div className="flex flex-col items-center gap-2">
          {/* Expand Trigger */}
          <Button
            variant="ghost"
            size="icon-xs"
            title="Expand sidebar"
            onClick={toggleCollapse}
            className="rounded-lg"
          >
            <PanelLeftOpenIcon className="size-4" />
          </Button>

          {/* New Chat icon */}
          <Button
            variant="outline"
            size="icon-xs"
            title="New Chat"
            render={<Link href="/" />}
            nativeButton={false}
            className="rounded-lg"
          >
            <PlusIcon className="size-4" />
          </Button>

          {/* New Project icon */}
          <Button
            variant="ghost"
            size="icon-xs"
            title="New Project"
            onClick={() => {
              setIsCollapsed(false)
              setIsCreatingFolder(true)
            }}
            className="rounded-lg"
          >
            <FolderPlusIcon className="size-4" />
          </Button>
        </div>

        <div className="my-3 h-px w-8 bg-border" />

        {/* Collapsed icon list */}
        <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto w-full px-1">
          {chats.slice(0, 10).map((chat) => (
            <Link
              key={chat.id}
              href={`/chat/${chat.id}`}
              title={chat.title || "Chat"}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                pathname === `/chat/${chat.id}` && "bg-accent font-medium text-primary"
              )}
            >
              <MessageSquareIcon className="size-4" />
            </Link>
          ))}
        </div>
      </aside>
    )
  }

  // ----------------------------------------------------
  // Full Expanded Sidebar View
  // ----------------------------------------------------
  return (
    <>
      <aside className="relative flex h-full w-64 shrink-0 flex-col border-r border-border bg-muted/20 transition-all duration-300 select-none">
        {/* Action Header: New Chat, New Project, and Collapse Button */}
        <div className="flex items-center gap-1.5 border-b border-border p-3">
          <Button
            variant="outline"
            className="flex-1 justify-start gap-2 h-8 text-xs font-medium"
            render={<Link href="/" />}
            nativeButton={false}
          >
            <PlusIcon className="size-3.5 shrink-0" />
            <span className="truncate">New Chat</span>
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            title="New Project"
            onClick={() => setIsCreatingFolder(true)}
            className="rounded-lg"
          >
            <FolderPlusIcon className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            title="Collapse sidebar"
            onClick={toggleCollapse}
            className="rounded-lg"
          >
            <PanelLeftCloseIcon className="size-3.5" />
          </Button>
        </div>

        {/* Inline New Project Form */}
        {isCreatingFolder && (
          <form
            onSubmit={handleCreateFolder}
            className="border-b border-border p-2"
          >
            <div className="flex items-center gap-1">
              <input
                type="text"
                autoFocus
                placeholder="Project name…"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
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

        {/* Scrollable List */}
        <div className="flex-1 space-y-4 overflow-y-auto p-2">
          {/* Projects / Folders */}
          {folders.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Projects
              </div>

              {folders.map((folder) => {
                const isOpen = openFolders[folder.id] ?? true
                const folderChats = chats.filter(
                  (c) => c.folder_id === folder.id
                )
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
                          className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
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
                          className="flex min-w-0 flex-1 items-center gap-2 text-left text-muted-foreground transition-colors group-hover:text-foreground cursor-pointer"
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
                          <span className="truncate font-medium">
                            {folder.name}
                          </span>
                          <span className="text-xs text-muted-foreground/60">
                            ({folderChats.length})
                          </span>
                        </button>

                        {/* Project Dropdown Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-foreground cursor-pointer focus:opacity-100 outline-none"
                            aria-label="Project actions"
                          >
                            <MoreHorizontalIcon className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingFolderId(folder.id)
                                setEditingFolderName(folder.name)
                              }}
                            >
                              <PencilIcon className="size-3.5 mr-2" />
                              Rename Project
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setFolderToDelete(folder)}
                            >
                              <Trash2Icon className="size-3.5 mr-2" />
                              Delete Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                              onRequestDelete={() => setChatToDelete(chat)}
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

          {/* Recent / Other Chats */}
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
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
                  onRequestDelete={() => setChatToDelete(chat)}
                  onMove={() => setMovingChat(chat)}
                />
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* Move Chat Dialog (Shadcn Dialog Component)           */}
      {/* ---------------------------------------------------- */}
      <Dialog
        open={Boolean(movingChat)}
        onOpenChange={(open) => !open && setMovingChat(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Project</DialogTitle>
            <DialogDescription>
              Select a destination project for &ldquo;{movingChat?.title}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 space-y-1 overflow-y-auto py-2">
            <button
              type="button"
              onClick={() => {
                if (movingChat) handleMoveChat(movingChat.id, null)
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-left transition-colors hover:bg-accent cursor-pointer",
                !movingChat?.folder_id &&
                  "bg-accent/80 font-medium text-foreground"
              )}
            >
              <MessageSquareIcon className="size-4 text-muted-foreground" />
              <span>Root (No Project)</span>
            </button>

            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (movingChat) handleMoveChat(movingChat.id, f.id)
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-left transition-colors hover:bg-accent cursor-pointer",
                  movingChat?.folder_id === f.id &&
                    "bg-accent/80 font-medium text-foreground"
                )}
              >
                <FolderIcon className="size-4 text-primary/80" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMovingChat(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- */}
      {/* Delete Chat Alert Dialog (Shadcn Alert-Dialog)       */}
      {/* ---------------------------------------------------- */}
      <AlertDialog
        open={Boolean(chatToDelete)}
        onOpenChange={(open) => !open && setChatToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{chatToDelete?.title}&rdquo;?
              This will permanently remove this chat and all of its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChatToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDeleteChat}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------------------------------------------------- */}
      {/* Delete Project Alert Dialog (Shadcn Alert-Dialog)    */}
      {/* ---------------------------------------------------- */}
      <AlertDialog
        open={Boolean(folderToDelete)}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete project &ldquo;{folderToDelete?.name}&rdquo;?
              Chats in this project will not be deleted; they will be moved to unassigned chats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFolderToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDeleteFolder}
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  onRequestDelete,
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
  onRequestDelete: () => void
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
          className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
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
        className="flex min-w-0 flex-1 items-center gap-2 truncate cursor-pointer"
      >
        <MessageSquareIcon className="size-3.5 shrink-0" />
        <span className="truncate">{chat.title || "Untitled Chat"}</span>
      </Link>

      {/* Chat Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "rounded p-1 text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground cursor-pointer outline-none",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
          )}
          aria-label="Chat actions"
        >
          <MoreHorizontalIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onMove()}>
            <FolderInputIcon className="size-3.5 mr-2" />
            Move to project…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStartEdit()}>
            <PencilIcon className="size-3.5 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onRequestDelete()}
          >
            <Trash2Icon className="size-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
