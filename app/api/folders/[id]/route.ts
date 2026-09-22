import { deleteFolder, renameFolder } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = (await req.json()) as { name?: string }
    if (typeof body.name === "string") {
      renameFolder(id, body.name)
    }
    return Response.json({ success: true })
  } catch {
    return Response.json(
      { error: "Something went wrong. Please try again later or contact support." },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    deleteFolder(id)
    return Response.json({ success: true })
  } catch {
    return Response.json(
      { error: "Something went wrong. Please try again later or contact support." },
      { status: 500 }
    )
  }
}
