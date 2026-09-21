import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateText,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai"
import { DEFAULT_MODEL, isModelAllowed } from "@/lib/models"
import { getTools, type ChatUIMessage } from "@/tools"
import { kodekloudClient } from "@/lib/kodekloud"
import {
  getOrCreateChat,
  saveMessage,
  saveMessages,
  updateChatTitle,
} from "@/lib/db"

export const maxDuration = 30
const MAX_OUTPUT_TOKENS = 8192

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const model = (body as { model?: unknown })?.model
  const modelId = typeof model === "string" ? model : DEFAULT_MODEL
  const chatId = (body as { chatId?: string })?.chatId ?? crypto.randomUUID()

  if (!isModelAllowed(modelId)) {
    return Response.json(
      { error: `Model ${modelId} is not available.` },
      { status: 400 }
    )
  }

  const tools = getTools(modelId)

  let messages: ChatUIMessage[]
  try {
    messages = await validateUIMessages<ChatUIMessage>({
      messages: (body as { messages?: unknown })?.messages,
      tools: tools as Parameters<typeof validateUIMessages>[0]["tools"],
    })
  } catch {
    return Response.json({ error: "Invalid messages." }, { status: 400 })
  }

  // 1. Get or create the chat session and persist incoming messages
  const lastUserMessage = messages.findLast((m) => m.role === "user")
  let promptPreview: string | undefined
  if (lastUserMessage) {
    const textPart = lastUserMessage.parts.find((p) => p.type === "text")
    promptPreview = textPart && "text" in textPart ? textPart.text : undefined
    getOrCreateChat(chatId, modelId, promptPreview)
  }
  // Persist all incoming messages received from the client (including tool results)
  saveMessages(chatId, messages)

  // 2. Stream generation
  const result = streamText({
    model: kodekloudClient.chat(modelId),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(5),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: req.signal,
  })

  // 3. UI Message stream with full persistence
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      sendSources: true,
      sendReasoning: true,
      originalMessages: messages,
      generateMessageId: () => crypto.randomUUID(),
      onError: () =>
        "Something went wrong. Please try again later or contact support.",
      onEnd: async ({ messages: updatedMessages, responseMessage }) => {
        // Save the updated messages (including the new assistant response message)
        const messagesToSave =
          updatedMessages && updatedMessages.length > 0
            ? updatedMessages
            : responseMessage
              ? [...messages, responseMessage]
              : messages
        saveMessages(chatId, messagesToSave)

        // If this is the first turn, generate a high-quality concise title
        const userMessages = messages.filter((m) => m.role === "user")
        if (userMessages.length <= 1 && promptPreview) {
          try {
            const { text: aiTitle } = await generateText({
              model: kodekloudClient.chat(modelId),
              system:
                "You generate clean, short titles for chat conversations. Output ONLY the title (3 to 5 words max). No punctuation at the end, no quotes, no conversational filler.",
              prompt: `User's first message: "${promptPreview}"\nTitle:`,
              maxOutputTokens: 20,
            })
            const clean = aiTitle.replace(/["'\n]/g, "").trim()
            if (clean) {
              updateChatTitle(chatId, clean)
            }
          } catch {
            // Keep existing formatted title if generation fails
          }
        }
      },
    }),
  })
}
