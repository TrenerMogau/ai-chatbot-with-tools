"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai"
import { RotateCcwIcon } from "lucide-react"
import { type GatewayModel } from "@/lib/models"
import { type ChatUIMessage } from "@/tools"
import { ChatMessage } from "@/components/chat-message"
import { PromptForm } from "@/components/prompt-form"
import { QuestionCard } from "@/components/question-card"
import { Suggestions } from "@/components/suggestions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { formatChatTitle } from "@/lib/utils"

export function Chat({
  id,
  initialMessages,
  models,
}: {
  id?: string
  initialMessages?: ChatUIMessage[]
  models: GatewayModel[]
}) {
  const [chatId] = React.useState(() => id ?? crypto.randomUUID())
  const [model, setModel] = React.useState(models[0]?.id ?? "")
  const router = useRouter()
  const pathname = usePathname()

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    addToolOutput,
    regenerate,
    setMessages,
  } = useChat<ChatUIMessage>({
    id: chatId,
    messages: initialMessages,
    // Resume the conversation automatically once the user has answered the
    // ask_user questionnaire.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: async () => {
      // If this was the first exchange, fetch the refined AI title
      if (messages.length <= 1) {
        try {
          const res = await fetch(`/api/chat/title?chatId=${chatId}`)
          if (res.ok) {
            const data = (await res.json()) as { title?: string }
            if (data.title) {
              window.dispatchEvent(
                new CustomEvent("chat-updated", {
                  detail: { id: chatId, title: data.title },
                })
              )
            }
          }
        } catch {
          // Ignore
        }
      }
    },
  })

  const handleSend = (text: string) => {
    if (!text.trim()) return

    // If we are on the root "/" page, sync the URL to /chat/<chatId>
    if (pathname === "/" || pathname === "/chat") {
      window.history.replaceState(null, "", `/chat/${chatId}`)
    }

    // If this is the start of a new chat, notify the sidebar immediately
    if (messages.length === 0) {
      window.dispatchEvent(
        new CustomEvent("chat-created", {
          detail: {
            id: chatId,
            title: formatChatTitle(text),
            model: resolvedModel,
            created_at: Date.now(),
            updated_at: Date.now(),
          },
        })
      )
    }

    sendMessage({ text }, { body: { model: resolvedModel, chatId } })
  }

  const handleEditPrompt = async (messageId: string, newText: string) => {
    if (!newText.trim() || isBusy) return

    const index = messages.findIndex((m) => m.id === messageId)
    if (index === -1) return

    // Truncate messages in SQLite from this prompt onwards
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      })
    } catch {
      // Ignore
    }

    // Keep preceding messages
    const preserved = messages.slice(0, index)
    setMessages(preserved)

    // Send updated prompt
    sendMessage({ text: newText }, { body: { model: resolvedModel, chatId } })
  }

  const handleRegenerate = (messageId?: string) => {
    if (isBusy) return
    regenerate({
      ...(messageId ? { messageId } : {}),
      body: { model: resolvedModel, chatId },
    })
  }

  const resolvedModel = models.some((m) => m.id === model)
    ? model
    : (models[0]?.id ?? "")

  const isBusy = status === "submitted" || status === "streaming"

  const lastMessage = messages.at(-1)
  const lastUserMessage = messages.findLast((m) => m.role === "user")
  const lastAssistantMessage = messages.findLast((m) => m.role === "assistant")

  const pendingQuestion =
    lastMessage?.role === "assistant"
      ? lastMessage.parts.find(
          (part): part is Extract<typeof part, { type: "tool-ask_user" }> =>
            part.type === "tool-ask_user" &&
            (part.state === "input-streaming" ||
              part.state === "input-available")
        )
      : undefined

  return (
    <div className="mx-auto flex min-h-0 w-full flex-1 flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>What can I help with?</EmptyTitle>
              <EmptyDescription>
                Pick a model and start chatting. Responses stream through the
                KodeKloud AI Playground.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Suggestions onSelect={handleSend} />
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <MessageScrollerProvider>
          <MessageScroller className="flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-6">
                {messages.map((message) => {
                  const isLastUser = message.id === lastUserMessage?.id
                  const isLastAssistant =
                    message.id === lastAssistantMessage?.id

                  return (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={message.role === "user"}
                    >
                      <ChatMessage
                        message={message}
                        isStreaming={isBusy && message.id === lastMessage?.id}
                        onEditPrompt={isLastUser ? handleEditPrompt : undefined}
                        onRegenerate={
                          isLastAssistant ? handleRegenerate : undefined
                        }
                      />
                    </MessageScrollerItem>
                  )
                })}
                {lastMessage?.role === "user" && !isBusy && (
                  <MessageScrollerItem messageId="interrupted-notice">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                      <span className="text-xs text-muted-foreground">
                        Response was interrupted. Click below to continue.
                      </span>
                      <Button
                        size="xs"
                        variant="default"
                        onClick={() => handleRegenerate()}
                        className="gap-1.5"
                      >
                        <RotateCcwIcon className="size-3" />
                        Generate response
                      </Button>
                    </div>
                  </MessageScrollerItem>
                )}
                {status === "submitted" && (
                  <MessageScrollerItem messageId="thinking">
                    <div className="flex shimmer items-center gap-2 px-3 text-sm text-muted-foreground">
                      Thinking…
                    </div>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
              {pendingQuestion && (
                <QuestionCard
                  part={pendingQuestion}
                  onAnswer={(toolCallId, answer) =>
                    addToolOutput({
                      tool: "ask_user",
                      toolCallId,
                      output: answer,
                      options: { body: { model: resolvedModel, chatId } },
                    })
                  }
                />
              )}
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-6 pb-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        <PromptForm
          models={models}
          model={resolvedModel}
          onModelChange={setModel}
          isBusy={isBusy}
          onSubmit={handleSend}
          onStop={() => stop()}
        />
      </div>
    </div>
  )
}
