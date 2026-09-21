import { tool } from "ai"
import { z } from "zod"

export const webSearchTool = tool({
  description:
    "Search the web for up-to-date information, current events, recent developments, or specific facts.",
  inputSchema: z.object({
    query: z.string().describe("The search query to look up on the web"),
  }),
  outputSchema: z.union([
    z.object({
      error: z.string(),
    }),
    z.object({
      results: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          snippet: z.string(),
        })
      ),
    }),
  ]),
  execute: async ({ query }, { abortSignal }) => {
    const apiKey = process.env.TAVILY_API_KEY || ""
    const baseUrl = (
      process.env.TAVILY_SEARCH_BASE_URL || "https://api.tavily.com/search"
    ).replace(/\/+$/, "")

    if (!apiKey) {
      return {
        error:
          "Search service is currently unavailable. Please try again later or contact support.",
      }
    }

    // Set a 10-second timeout so a slow search API does not hang your chat stream
    const timeout = AbortSignal.timeout(10000)
    const signal = abortSignal
      ? AbortSignal.any([abortSignal, timeout])
      : timeout

    try {
      const response = await fetch(`${baseUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          max_results: 5,
          search_depth: "basic",
        }),
        signal,
      })

      if (!response.ok) {
        return {
          error:
            "Search service is currently unavailable. Please try again later or contact support.",
        }
      }

      const data = await response.json()

      const rawResults = Array.isArray(data.results) ? data.results : []

      const results = rawResults.slice(0, 5).map((item: any) => ({
        title: String(item.title ?? "Web Result"),
        url: String(item.url ?? item.link ?? ""),
        snippet: String(item.content ?? item.snippet ?? item.description ?? ""),
      }))

      return { results }
    } catch {
      return {
        error:
          "Search service is currently unavailable. Please try again later or contact support.",
      }
    }
  },
})
