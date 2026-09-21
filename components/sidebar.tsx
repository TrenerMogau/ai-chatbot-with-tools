"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HomeIcon, MessageSquareIcon, PlusIcon } from "lucide-react"
import { type DBChat } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Sidebar({ initialChats = [] }: { initialChats?: DBChat[] }) {
  const [chats, setChats] = React.useState<DBChat[]>(initialChats)
  const pathname = usePathname()

  React.useEffect(() => {
    setChats(initialChats)
  }, [initialChats])

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
      const customEvent = e as CustomEvent<{ id: string; title: string }>
      if (!customEvent.detail) return
      setChats((prev) =>
        prev.map((c) =>
          c.id === customEvent.detail.id
            ? { ...c, title: customEvent.detail.title }
            : c
        )
      )
    }

    window.addEventListener("chat-created", handleChatCreated)
    window.addEventListener("chat-updated", handleChatUpdated)
    return () => {
      window.removeEventListener("chat-created", handleChatCreated)
      window.removeEventListener("chat-updated", handleChatUpdated)
    }
  }, [])

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-muted/30">
      {/* New Chat Button */}
      <div className="border-b border-border p-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          render={<Link href="/" />}
          nativeButton={false}
        >
          <PlusIcon className="size-4" />
          New Chat
        </Button>
      </div>

      {/* History list */}
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        <div className="px-2 py-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Recent Chats
        </div>

        {chats.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            No chats yet.
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = pathname === `/chat/${chat.id}`
            return (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className={cn(
                  "flex items-center gap-2 truncate rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
                )}
              >
                <MessageSquareIcon className="size-4 shrink-0" />
                <span className="truncate">
                  {chat.title || "Untitled Chat"}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </aside>
  )
}
