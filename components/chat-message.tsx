"use client"

import * as React from "react"
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  RotateCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react"
import { type ChatUIMessage } from "@/tools"
import { AskUserPart } from "@/components/parts/ask-user-part"
import { GithubRepoPart } from "@/components/parts/github-repo-part"
import { ReasoningPart } from "@/components/parts/reasoning-part"
import { SourcesPart } from "@/components/parts/sources-part"
import { TextPart } from "@/components/parts/text-part"
import { WebSearchPart } from "@/components/parts/web-search-part"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Message, MessageContent } from "@/components/ui/message"
import { cn } from "@/lib/utils"

export function ChatMessage({
  message,
  isStreaming = false,
  onEditPrompt,
  onRegenerate,
}: {
  message: ChatUIMessage
  isStreaming?: boolean
  onEditPrompt?: (messageId: string, newText: string) => void
  onRegenerate?: (messageId: string) => void
}) {
  const [copied, setCopied] = React.useState(false)
  const [feedback, setFeedback] = React.useState<"like" | "dislike" | null>(
    null
  )
  const [isEditing, setIsEditing] = React.useState(false)
  const [editText, setEditText] = React.useState("")

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore
    }
  }

  // --- User Message ---
  if (message.role === "user") {
    const userText = message.parts
      .filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text"
      )
      .map((part) => part.text)
      .join("")

    const handleStartEdit = () => {
      setEditText(userText)
      setIsEditing(true)
    }

    const handleSaveEdit = () => {
      const trimmed = editText.trim()
      if (trimmed && trimmed !== userText) {
        onEditPrompt?.(message.id, trimmed)
      }
      setIsEditing(false)
    }

    return (
      <Message align="end" className="group">
        <MessageContent className="items-end">
          {isEditing ? (
            <div className="w-full max-w-xl space-y-2 rounded-2xl border border-border bg-card p-3 shadow-md">
              <textarea
                autoFocus
                rows={Math.min(6, Math.max(2, editText.split("\n").length))}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSaveEdit()
                  }
                  if (e.key === "Escape") {
                    setIsEditing(false)
                  }
                }}
                className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="xs"
                  onClick={handleSaveEdit}
                  disabled={!editText.trim()}
                >
                  Save &amp; Submit
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Bubble align="end" variant="muted">
                <BubbleContent>{userText}</BubbleContent>
              </Bubble>

              {/* User Prompt Action Bar */}
              <div className="flex items-center gap-1.5 pt-1 text-muted-foreground">
                {onEditPrompt && (
                  <button
                    type="button"
                    title="Edit prompt"
                    onClick={handleStartEdit}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <PencilIcon className="size-3.5" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  type="button"
                  title="Copy prompt"
                  onClick={() => handleCopy(userText)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {copied ? (
                    <CheckIcon className="size-3.5 text-emerald-500" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </>
          )}
        </MessageContent>
      </Message>
    )
  }

  // --- Assistant Message ---
  const assistantText = message.parts
    .filter(
      (part): part is Extract<typeof part, { type: "text" }> =>
        part.type === "text"
    )
    .map((part) => part.text)
    .join("\n\n")

  return (
    <Message align="start" className="group">
      <MessageContent>
        {message.parts.map((part, index) => {
          switch (part.type) {
            case "reasoning":
              return (
                <ReasoningPart
                  key={index}
                  part={part}
                  isStreaming={isStreaming}
                />
              )
            case "text":
              return <TextPart key={index} part={part} />
            case "tool-github_repo":
              return (
                <GithubRepoPart key={part.toolCallId ?? index} part={part} />
              )
            case "tool-ask_user":
              return <AskUserPart key={part.toolCallId ?? index} part={part} />
            case "tool-web_search":
              return (
                <WebSearchPart key={part.toolCallId ?? index} part={part} />
              )
            default:
              return null
          }
        })}

        {message.parts.length === 0 && !isStreaming && (
          <div className="text-xs text-muted-foreground italic">
            No response generated yet.
          </div>
        )}

        <SourcesPart parts={message.parts} />

        {/* Assistant Action Bar */}
        {!isStreaming && (
          <div className="mt-2 flex items-center gap-1 border-t border-border/30 pt-2 text-muted-foreground">
            {/* Copy button */}
            {assistantText.length > 0 && (
              <button
                type="button"
                title="Copy response"
                onClick={() => handleCopy(assistantText)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {copied ? (
                  <>
                    <CheckIcon className="size-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="size-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}

            {/* Like button */}
            {assistantText.length > 0 && (
              <button
                type="button"
                title="Good response"
                onClick={() =>
                  setFeedback((prev) => (prev === "like" ? null : "like"))
                }
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  feedback === "like"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <ThumbsUpIcon
                  className={cn(
                    "size-3.5",
                    feedback === "like" && "fill-current"
                  )}
                />
              </button>
            )}

            {/* Dislike button */}
            {assistantText.length > 0 && (
              <button
                type="button"
                title="Bad response"
                onClick={() =>
                  setFeedback((prev) => (prev === "dislike" ? null : "dislike"))
                }
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  feedback === "dislike"
                    ? "bg-destructive/10 text-destructive"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <ThumbsDownIcon
                  className={cn(
                    "size-3.5",
                    feedback === "dislike" && "fill-current"
                  )}
                />
              </button>
            )}

            {/* Regenerate button */}
            {onRegenerate && (
              <button
                type="button"
                title="Regenerate response"
                onClick={() => onRegenerate(message.id)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RotateCcwIcon className="size-3.5" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </MessageContent>
    </Message>
  )
}
