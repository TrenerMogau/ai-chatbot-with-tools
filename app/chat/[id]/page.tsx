import { notFound } from "next/navigation"
import { getChat, getChatMessages } from "@/lib/db"
import { MODELS } from "@/lib/models"
import { Chat } from "@/components/chat"

export default async function SavedChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const chat = getChat(id)
  if (!chat) notFound()

  const messages = getChatMessages(id)

  return (
    <Chat
      key={chat.id}
      id={chat.id}
      initialMessages={messages}
      models={MODELS}
    />
  )
}
