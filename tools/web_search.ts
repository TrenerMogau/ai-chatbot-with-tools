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
      process.env.FREE_AI_BASE_URL || "https://api.free.ai"
    ).replace(/\/+$/, "")

    if (!apiKey) {
      return {
        error:
          "Search service is currently unavailable. Please try again later or contact support.",
      }
    }

    // Set an 10-second timeout so a slow search API does not hang your chat stream
    const timeout = AbortSignal.timeout(10000)
    const signal = abortSignal
      ? AbortSignal.any([abortSignal, timeout])
      : timeout

    try {
      // NOTE: Adjust the endpoint path (/v1/search or /search) and method (GET or POST)
      // according to Free AI's exact API documentation
      const response = await fetch(`${baseUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query, limit: 5 }),
        signal,
      })

      if (!response.ok) {
        console.error(response.body)
        return {
          error:
            "Search service is currently unavailable. Please try again later or contact support.",
        }
      }

      const data = await response.json()

      // Map Free AI's response fields into standard title/url/snippet format
      // (adapt property names like data.results, data.data, or items to match the API response)
      const rawResults = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data)
          ? data
          : []

      const results = rawResults.slice(0, 5).map((item: any) => ({
        title: String(item.title ?? "Web Result"),
        url: String(item.url ?? item.link ?? ""),
        snippet: String(item.snippet ?? item.content ?? item.description ?? ""),
      }))

      return { results }
    } catch (err) {
      console.error(err)
      return {
        error:
          "Search service is currently unavailable. Please try again later or contact support.",
      }
    }
  },
})
