import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Only allow http(s) URLs to reach an href, so untrusted model/web/tool output
// can't smuggle a javascript: or data: scheme into a link.
export function safeHttpUrl(url: string): string | undefined {
  try {
    const { protocol } = new URL(url)
    return protocol === "http:" || protocol === "https:" ? url : undefined
  } catch {
    return undefined
  }
}

// Clean conversational text into a readable title
export function formatChatTitle(rawText?: string): string {
  if (!rawText) return "New Chat"

  let text = rawText.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim()

  // Remove common conversational opener prefixes
  const fillerRegex =
    /^(hey|hello|hi|please|can you|could you|would you|tell me|explain|what is|how to|i want to|i need to|help me with|help me|show me)\b[\s,:-]*/i
  while (fillerRegex.test(text)) {
    text = text.replace(fillerRegex, "").trim()
  }

  if (!text) text = rawText.trim()

  // Cut cleanly at word boundary (max ~42 characters)
  if (text.length > 42) {
    const cut = text.slice(0, 42)
    const lastSpace = cut.lastIndexOf(" ")
    text = (lastSpace > 15 ? cut.slice(0, lastSpace) : cut).trim()
  }

  // Strip trailing punctuation and capitalize first letter
  text = text.replace(/[.,:;?!]+$/, "").trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "New Chat"
}
