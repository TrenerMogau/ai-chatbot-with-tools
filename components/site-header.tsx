import Link from "next/link"

import { NewChatButton } from "@/components/new-chat-button"
import { HomeIcon } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-2 px-6 py-3">
      <Link href="/" className="flex flex-row outline outline-1 outline-zinc-300 align-center gap-1 center text-sm font-medium px-4 py-1 rounded-full bg-zinc-200/70 hover:bg-zinc-300">
        <HomeIcon className="w-4 h-4"/>
        <span>
          Trener Chat
        </span>
      </Link>
      <NewChatButton />
    </header>
  )
}
