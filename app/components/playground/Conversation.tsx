import { useEffect, useRef, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { ClipboardCopy, Copy, Trash, Sigma, Clock } from "lucide-react";
import { toast } from "sonner";

import { useConversation, usePlaygroundStore } from "~/contexts/store";
import {
  defaultConversationConfig,
  reasoningEfforts,
  roles,
  type Message,
  type ReasoningEffort,
} from "~/config/ai";
import { injectVarsIntoTemplate } from "~/lib/variables";
import { cn, seededRandomBackground } from "~/lib/utils";
import { useModels } from "~/hooks/useModels";

type ConversationProps = {
  id: string;
};

async function streamChat(
  messages: Message[],
  body: Record<string, unknown>,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; responseTime: number; usage?: NonNullable<Message["metadata"]>["usage"] }> {
  const start = Date.now();

  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, messages }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    onDelta(chunk);
  }

  // Extract usage metadata appended by the server
  let usage: NonNullable<Message["metadata"]>["usage"];
  const metaDelimiter = "\n__META__";
  const metaIndex = fullText.lastIndexOf(metaDelimiter);
  if (metaIndex !== -1) {
    try {
      const meta = JSON.parse(fullText.substring(metaIndex + metaDelimiter.length));
      usage = meta.usage;
    } catch {}
    fullText = fullText.substring(0, metaIndex);
  }

  return { text: fullText, responseTime: Date.now() - start, usage };
}

export function Conversation({ id }: ConversationProps) {
  const {
    systemPrompt,
    systemPromptVars,
    temperature,
    maxTokens,
    removeConversation,
    updateConversation,
    addMessage,
    removeMessage,
    updateMessage,
    addTestCase,
    duplicateConversation,
    conversations,
  } = usePlaygroundStore();

  const { models, providers } = useModels();

  const currentConversation = useConversation(id);

  const abortRef = useRef<AbortController | null>(null);

  const sendMessages = useCallback(
    async (messages: Message[]) => {
      updateConversation(id, { isLoading: true });

      const body = {
        provider: currentConversation.provider,
        model: currentConversation.model,
        max_tokens: maxTokens,
        temperature,
        reasoningEffort: currentConversation.reasoningEffort,
      };

      try {
        abortRef.current = new AbortController();

        const { text, responseTime, usage } = await streamChat(
          messages,
          body,
          () => {
            // Streaming delta - could be used for live preview in the future
          },
          abortRef.current.signal,
        );

        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: text,
          metadata: { responseTime, usage },
        };

        addMessage(id, assistantMessage);

        // scroll to bottom
        document.body.scrollIntoView({ behavior: "smooth", block: "end" });
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error(
          "Error while generating response for conversation",
          id,
          error,
        );
        toast.error("Error while generating response. Please try again.", {
          description: error.message,
        });
      } finally {
        updateConversation(id, { isLoading: false });
        abortRef.current = null;
      }
    },
    [id, currentConversation.provider, currentConversation.model, currentConversation.reasoningEffort, maxTokens, temperature, updateConversation, addMessage],
  );

  const handleCopyResponse = (content: Message["content"]) => {
    const textContent =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("\n")
          : "";

    if (textContent) {
      navigator.clipboard.writeText(textContent);
      toast.info("Response copied to clipboard!");
    } else {
      toast.warning("No text content to copy.");
    }
  };

  useEffect(() => {
    return usePlaygroundStore.subscribe((currentState, prevState) => {
      const currentConversation = currentState.conversations.find(
        (conv) => conv.id === id,
      )!;

      if (currentState.runs.length !== prevState.runs.length) {
        const messages = systemPrompt
          ? [
              {
                id: Date.now().toString(),
                role: "system" as const,
                content: injectVarsIntoTemplate(
                  systemPrompt,
                  systemPromptVars,
                ),
              } as Message,
              ...currentConversation.messages,
            ]
          : currentConversation.messages;

        sendMessages(messages);
      }
    });
  }, [id, systemPrompt, systemPromptVars, sendMessages]);

  return (
    <div
      key={id}
      className={cn(
        "flex min-h-[75vh] flex-1 flex-col rounded-lg p-4 border-4",
        seededRandomBackground(
          currentConversation.provider + ":" + currentConversation.model,
        ),
      )}
    >
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center justify-start gap-0.5 flex-1 min-w-[48] max-w-[60%]">
          <Select
            value={
              currentConversation.provider ?? defaultConversationConfig.provider
            }
            onValueChange={(value) => {
              updateConversation(id, {
                provider: value,
              });
            }}
            required
          >
            <SelectTrigger className="w-max bg-input/25">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="Model name here... Eg: gpt-4o"
            value={currentConversation.model ?? defaultConversationConfig.model}
            onChange={(e) => {
              updateConversation(id, { model: e.currentTarget.value });
            }}
            className="w-full invalid:border-red-500 bg-input/25"
            minLength={1}
            required
          />

          <Select
            value={currentConversation.model ?? defaultConversationConfig.model}
            onValueChange={(value) => {
              updateConversation(id, { model: value });
            }}
          >
            <SelectTrigger className="w-max">
              {/* <SelectValue /> */}
            </SelectTrigger>
            <SelectContent>
              {(models[
                currentConversation.provider ??
                  defaultConversationConfig.provider
              ] ?? []).map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentConversation.reasoningEffort}
            onValueChange={(value) =>
              updateConversation(id, { reasoningEffort: value as ReasoningEffort })
            }
          >
            <SelectTrigger className="w-max bg-input/25 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reasoningEfforts.map((effort) => (
                <SelectItem key={effort} value={effort}>
                  {effort === "off" ? "Thinking: Off" : `Thinking: ${effort}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-row items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              addTestCase(currentConversation);

              toast.success("Test case added successfully");
            }}
            disabled={
              (!systemPrompt && currentConversation.messages.length === 0) ||
              currentConversation.messages.at(-1)?.role === "assistant"
            }
          >
            Save TC
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              duplicateConversation(id);
              toast.success("Conversation duplicated successfully");
            }}
            title="Duplicate conversation"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => removeConversation(id)}
            disabled={conversations.length < 2}
            title="Remove Conversation"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex-1">
        {currentConversation.messages.length === 0 ? (
          <div className="h-[50%] flex items-center justify-center">
            <p className="text-center text-sm font-medium">Start chatting!</p>
          </div>
        ) : null}

        {currentConversation.messages.map((message, msgIndex) => (
          <div
            key={msgIndex}
            className={`mb-4 flex flex-row items-end gap-2 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex basis-3/4 flex-col items-stretch justify-start gap-2`}
            >
              <Select
                value={message.role}
                onValueChange={(value) =>
                  updateMessage(id, message.id!, {
                    role: value as Message["role"],
                  })
                }
                required
              >
                <SelectTrigger className="h-auto w-max gap-2 text-xs/none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {typeof message.content === "string" ? (
                <Textarea
                  value={message.content}
                  onChange={(e) => {
                    updateMessage(id, message.id!, {
                      content: e.currentTarget.value,
                    });

                    e.currentTarget.style.height = "auto";
                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                  }}
                  className={`message-textarea resize-none overflow-hidden w-full rounded-lg border p-4 text-sm ${
                    message.role === "user"
                      ? "bg-secondary/50 text-secondary-foreground"
                      : message.role === "system"
                        ? "bg-green-50"
                        : "bg-secondary text-secondary-foreground"
                  }`}
                />
              ) : (
                Array.isArray(message.content) && (
                  <div className="flex flex-col gap-2">
                    {message.content.map((contentPart, idx) => (
                      <div key={idx}>
                        {contentPart.type === "text" && (
                          <Textarea
                            value={contentPart.text}
                            readOnly
                            className={`message-textarea resize-none overflow-hidden w-full rounded-lg border p-4 text-sm ${
                              message.role === "user"
                                ? "bg-secondary/50 text-secondary-foreground"
                                : message.role === "system"
                                  ? "bg-green-50"
                                  : "bg-secondary text-secondary-foreground"
                            }`}
                          />
                        )}
                        {contentPart.type === "image" && (
                          <div className="border rounded-lg overflow-hidden bg-secondary/20 p-2">
                            <img
                              src={`data:${contentPart.mediaType};base64,${contentPart.image}`}
                              alt="Uploaded image"
                              className="max-h-64 w-full object-contain"
                            />
                          </div>
                        )}
                        {contentPart.type === "file" &&
                          contentPart.mediaType.startsWith("audio/") && (
                            <div className="border rounded-lg overflow-hidden bg-secondary/20 p-2">
                              <audio
                                src={`data:${contentPart.mediaType};base64,${contentPart.data}`}
                                controls
                                className="w-full"
                              />
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Display token usage and response time for assistant messages */}
              {message.role === "assistant" && message.metadata && (
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                  {message.metadata.usage && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-2"
                      title="Token usage (prompt/completion)"
                    >
                      <Sigma className="h-3 w-3" />
                      {message.metadata.usage.totalTokens || 0}
                      {message.metadata.usage.promptTokens &&
                        message.metadata.usage.completionTokens && (
                          <span className="text-xs opacity-70">
                            ({message.metadata.usage.promptTokens}/
                            {message.metadata.usage.completionTokens})
                          </span>
                        )}
                    </Badge>
                  )}
                  {message.metadata.responseTime && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-2"
                      title="Response generation time"
                    >
                      <Clock className="h-3 w-3" />
                      {(message.metadata.responseTime / 1000).toFixed(2)}s
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleCopyResponse(message.content as string)}
                size="icon"
                variant="ghost"
              >
                <ClipboardCopy className="h-4 w-4" />
              </Button>

              <Button
                onClick={() => removeMessage(id, message.id!)}
                size="icon"
                variant="ghost"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {currentConversation.isLoading ? (
          <div className="flex flex-row items-end gap-2">
            <div className="flex basis-3/4 flex-col items-stretch justify-start gap-2">
              <Skeleton className="h-8 w-20 rounded" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-9 w-9 rounded" />
              <Skeleton className="h-9 w-9 rounded" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
