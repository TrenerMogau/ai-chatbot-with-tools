import { createFolder, getAllFolders } from "@/lib/db"

export async function GET() {
  const folders = getAllFolders()
  return Response.json({ folders })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string }
    const folder = createFolder(body.name || "New Project")
    return Response.json({ folder })
  } catch {
    return Response.json(
      { error: "Something went wrong. Please try again later or contact support." },
      { status: 500 }
    )
  }
}
