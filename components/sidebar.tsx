import Link from "next/link"
import { MessageSquareIcon, PlusIcon } from "lucide-react"
import { getAllChats } from "@/lib/db"
import { Button } from "@/components/ui/button"

export function Sidebar() {
  const chats = getAllChats()

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
          chats.map((chat) => (
            <Link
              key={chat.id}
              href={`/chat/${chat.id}`}
              className="flex items-center gap-2 truncate rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <MessageSquareIcon className="size-4 shrink-0" />
              <span className="truncate">{chat.title || "Untitled Chat"}</span>
            </Link>
          ))
        )}
      </div>
    </aside>
  )
}
