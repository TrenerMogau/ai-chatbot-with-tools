"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { BrainIcon, SparklesIcon } from "lucide-react"
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai/chain-of-thought"
import {
  MarkdownCode,
  MarkdownPre,
  rehypeInlineCodeProperty,
} from "@/components/markdown-code"
import { type ReasoningMessagePart } from "@/tools"
import { cn } from "@/lib/utils"

export function ReasoningPart({
  part,
  isStreaming = false,
}: {
  part: ReasoningMessagePart
  isStreaming?: boolean
}) {
  const [userToggled, setUserToggled] = React.useState<boolean | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  if (!part.text && !isStreaming) {
    return null
  }

  const isThinking = isStreaming && part.state !== "done"
  // Auto-expand during thinking unless user manually toggled; collapse once finished
  const open = userToggled !== null ? userToggled : isThinking

  // Auto-scroll to bottom as new reasoning chunks stream in
  React.useEffect(() => {
    if (isThinking && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [part.text, isThinking])

  return (
    <ChainOfThought
      open={open}
      onOpenChange={(nextOpen: boolean) => setUserToggled(nextOpen)}
      className="my-2.5 w-full"
    >
      <ChainOfThoughtHeader>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span>{isThinking ? "Thinking…" : "Thought process"}</span>
          {isThinking && (
            <span className="size-2 animate-pulse rounded-full bg-primary" />
          )}
        </div>
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <ChainOfThoughtStep
          icon={BrainIcon}
          label={
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <span>
                {isThinking ? "Reasoning in progress" : "Reasoning complete"}
              </span>
            </div>
          }
          status={isThinking ? "active" : "complete"}
        >
          <div
            ref={scrollRef}
            className="mt-2 max-h-96 overflow-y-auto scroll-smooth rounded-lg border border-border/50 bg-muted/20 p-3.5 font-sans text-xs leading-relaxed text-muted-foreground"
          >
            {part.text ? (
              <div className="space-y-2.5">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeInlineCodeProperty]}
                  components={{
                    code: ({ className, children, ...props }) => {
                      const isInline =
                        !className && !String(children).includes("\n")
                      if (isInline) {
                        return (
                          <code
                            className={cn(
                              "rounded border border-border/60 bg-muted/80 px-1.5 py-0.5 font-mono text-[11px] font-normal text-foreground",
                              className
                            )}
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      }
                      return (
                        <MarkdownCode
                          className={className}
                          inline={false}
                          {...props}
                        >
                          {children}
                        </MarkdownCode>
                      )
                    },
                    pre: MarkdownPre,
                    p: ({ children }) => (
                      <p className="leading-relaxed text-muted-foreground/90">
                        {children}
                      </p>
                    ),
                    h1: ({ children }) => (
                      <h1 className="mt-3 mb-1.5 text-xs font-semibold text-foreground">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="mt-2.5 mb-1 text-xs font-semibold text-foreground">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mt-2 mb-1 text-xs font-medium text-foreground">
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="my-1.5 list-outside list-disc space-y-1 pl-4 text-muted-foreground/90">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="my-1.5 list-outside list-decimal space-y-1 pl-4 text-muted-foreground/90">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="leading-relaxed">{children}</li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-2 border-l-2 border-border/70 pl-3 text-muted-foreground/80 italic">
                        {children}
                      </blockquote>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">
                        {children}
                      </strong>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {part.text}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground/60 italic">
                <SparklesIcon className="size-3.5 animate-spin" />
                <span>Formulating thoughts and analyzing context…</span>
              </div>
            )}
          </div>
        </ChainOfThoughtStep>
      </ChainOfThoughtContent>
    </ChainOfThought>
  )
}
