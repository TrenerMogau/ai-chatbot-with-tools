import { getOrCreateChat } from "@/lib/db"
import { DEFAULT_MODEL } from "@/lib/models"

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      folderId?: string | null
      title?: string
    }
    const chatId = crypto.randomUUID()
    const folderId = body.folderId ?? null
    const title = body.title?.trim() || "New Chat"

    const chat = getOrCreateChat(chatId, DEFAULT_MODEL, title, folderId)
    return Response.json({ success: true, chat })
  } catch {
    return Response.json(
      {
        error:
          "Something went wrong. Please try again later or contact support.",
      },
      { status: 500 }
    )
  }
}
