import fs from "fs"
import { createOpenAI } from "@ai-sdk/openai"
import { streamText, extractReasoningMiddleware, wrapLanguageModel, toUIMessageStream } from "ai"

const envFile = fs.readFileSync(".env.local", "utf8")
const env = {}
for (const line of envFile.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let val = (match[2] || "").trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    env[match[1]] = val
  }
}

const baseUrl = env.KODEKLOUD_BASE_URL || "https://api.ai.kodekloud.com/v1"
const apiKey = env.KODEKLOUD_API_KEY

const customFetch = async (url, options) => {
  const response = await fetch(url, options)

  if (!response.ok || !response.body || !url.toString().includes("/chat/completions")) {
    return response
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  let buffer = ""
  let isReasoning = false

  const transformedStream = new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (isReasoning) {
            const closeChunk = `data: {"choices":[{"index":0,"delta":{"content":"</think>"}}]}\n\n`
            controller.enqueue(encoder.encode(closeChunk))
            isReasoning = false
          }
          if (buffer.trim()) {
            controller.enqueue(encoder.encode(buffer))
          }
          controller.close()
          return
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith("data: ")) {
            controller.enqueue(encoder.encode(line + "\n"))
            continue
          }

          if (trimmed === "data: [DONE]") {
            if (isReasoning) {
              const closeChunk = `data: {"choices":[{"index":0,"delta":{"content":"</think>"}}]}\n\n`
              controller.enqueue(encoder.encode(closeChunk))
              isReasoning = false
            }
            controller.enqueue(encoder.encode(line + "\n"))
            continue
          }

          try {
            const data = JSON.parse(trimmed.slice(6))
            const choice = data.choices?.[0]
            const delta = choice?.delta

            if (delta && "reasoning_content" in delta && delta.reasoning_content) {
              let text = delta.reasoning_content
              if (!isReasoning) {
                text = "<think>" + text
                isReasoning = true
              }
              delta.content = text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            } else if (delta && ("content" in delta || "tool_calls" in delta || choice?.finish_reason)) {
              if (isReasoning) {
                delta.content = "</think>" + (delta.content || "")
                isReasoning = false
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            } else {
              controller.enqueue(encoder.encode(line + "\n"))
            }
          } catch {
            controller.enqueue(encoder.encode(line + "\n"))
          }
        }
      }
    }
  })

  return new Response(transformedStream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

const client = createOpenAI({
  baseURL: baseUrl,
  apiKey: apiKey,
  fetch: customFetch,
})

async function test() {
  const rawModel = client.chat("qwen/qwen3.8-flash")
  const model = wrapLanguageModel({
    model: rawModel,
    middleware: extractReasoningMiddleware({ tagName: "think" }),
  })

  const messages = [
    { id: "1", role: "user", parts: [{ type: "text", text: "What is 12 * 12? Think briefly." }] }
  ]

  const result = streamText({
    model,
    messages: [{ role: "user", content: "What is 12 * 12? Think briefly." }]
  })

  let onEndPayload = null
  const uiStream = toUIMessageStream({
    stream: result.stream,
    originalMessages: messages,
    sendReasoning: true,
    onEnd: async (data) => {
      onEndPayload = data
    }
  })

  const reader = uiStream.getReader()
  while (true) {
    const { done } = await reader.read()
    if (done) break
  }

  console.log("onEnd updatedMessages count:", onEndPayload?.messages?.length)
  console.log("onEnd responseMessage parts:", JSON.stringify(onEndPayload?.responseMessage?.parts, null, 2))
}

test().catch(console.error)

