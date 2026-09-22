import {
  deleteChat,
  moveChatToFolder,
  truncateChatMessagesAfter,
  updateChatTitle,
} from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let body: { title?: string; folderId?: string | null }
  try {
    body = await req.json()
  } catch {
    return Response.json(
      {
        error:
          "Something went wrong. Please try again later or contact support.",
      },
      { status: 400 }
    )
  }

  if (typeof body.title === "string") {
    updateChatTitle(id, body.title)
  }

  if (body.folderId !== undefined) {
    moveChatToFolder(id, body.folderId)
  }

  return Response.json({ success: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    deleteChat(id)
    return Response.json({ success: true })
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = (await req.json()) as { messageId?: string }
    if (body.messageId) {
      truncateChatMessagesAfter(id, body.messageId)
    }
    return Response.json({ success: true })
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
