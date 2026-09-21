"use client"

import { BrainIcon } from "lucide-react"
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai/chain-of-thought"
import { type ReasoningMessagePart } from "@/tools"

export function ReasoningPart({
  part,
  isStreaming = false,
}: {
  part: ReasoningMessagePart
  isStreaming?: boolean
}) {
  if (!part.text && !isStreaming) {
    return null
  }

  const isThinking = isStreaming && part.state !== "done"

  return (
    <ChainOfThought defaultOpen={isThinking} className="my-2 w-full">
      <ChainOfThoughtHeader>
        <div className="flex items-center gap-2">
          <span>{isThinking ? "Thinking…" : "Thought process"}</span>
          {isThinking && (
            <span className="size-2 animate-pulse rounded-full bg-primary" />
          )}
        </div>
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <ChainOfThoughtStep
          icon={BrainIcon}
          label={isThinking ? "Reasoning in progress" : "Reasoning complete"}
          status={isThinking ? "active" : "complete"}
        >
          <div className="mt-2 max-h-96 overflow-y-auto rounded-md border border-border/40 bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {part.text || "Analyzing prompt and formulating response…"}
          </div>
        </ChainOfThoughtStep>
      </ChainOfThoughtContent>
    </ChainOfThought>
  )
}
