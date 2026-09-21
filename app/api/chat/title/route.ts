import { getChat } from "@/lib/db"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const chatId = searchParams.get("chatId")

  if (!chatId) {
    return Response.json({ error: "Missing chatId" }, { status: 400 })
  }

  const chat = getChat(chatId)
  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 })
  }

  return Response.json({ title: chat.title })
}
