"use client"

import * as React from "react"
import { ArrowUpRightIcon, ChevronDownIcon, GlobeIcon } from "lucide-react"

import { type ChatMessagePart } from "@/tools"
import { cn, safeHttpUrl } from "@/lib/utils"

export interface SourceItem {
  url: string
  title: string
  snippet?: string
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function getUniqueSources(parts: ChatMessagePart[]): SourceItem[] {
  const sources: SourceItem[] = []
  const seenUrls = new Set<string>()

  for (const part of parts) {
    // 1. Standard source-url parts
    if (part.type === "source-url" && safeHttpUrl(part.url)) {
      if (!seenUrls.has(part.url)) {
        seenUrls.add(part.url)
        sources.push({
          url: part.url,
          title: part.title || getHostname(part.url),
        })
      }
    }

    // 2. Web search tool output results
    if (part.type === "tool-web_search") {
      const output = part.output as
        | {
            results?: Array<{ title?: string; url?: string; snippet?: string }>
          }
        | undefined

      if (output?.results && Array.isArray(output.results)) {
        for (const item of output.results) {
          if (item?.url && safeHttpUrl(item.url)) {
            if (!seenUrls.has(item.url)) {
              seenUrls.add(item.url)
              sources.push({
                url: item.url,
                title: item.title || getHostname(item.url),
                snippet: item.snippet,
              })
            }
          }
        }
      }
    }
  }

  return sources
}

export function SourcesPart({ parts }: { parts: ChatMessagePart[] }) {
  const sources = getUniqueSources(parts)
  const [isOpen, setIsOpen] = React.useState(false)

  if (sources.length === 0) {
    return null
  }

  return (
    <div className="mt-3 border-t border-border/40 pt-2">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <GlobeIcon className="size-3.5 text-primary/70" />
        <span>Sources ({sources.length})</span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 transition-transform duration-200",
            isOpen ? "rotate-180" : "rotate-0"
          )}
        />
      </button>

      {isOpen && (
        <div className="mt-2.5 flex animate-in flex-wrap gap-2 duration-200 fade-in-0 slide-in-from-top-1">
          {sources.map((source, index) => {
            const hostname = getHostname(source.url)
            const title = source.title || hostname

            return (
              <a
                key={source.url + index}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                title={source.snippet ? `${title}\n\n${source.snippet}` : title}
                className="group flex max-w-[280px] items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1.5 text-xs shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/60"
              >
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground group-hover:text-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <div className="truncate font-medium text-foreground group-hover:text-primary">
                    {title}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {hostname}
                  </div>
                </div>
                <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
