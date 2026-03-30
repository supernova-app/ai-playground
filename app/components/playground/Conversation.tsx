import { useEffect, useRef } from "react";
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
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type LanguageModelUsage } from "ai";

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

  const { providers, getModelNames, isReasoningModel } = useModels();

  const currentConversation = useConversation(id);

  const requestStartTime = useRef<number | null>(null);

  const {
    messages: chatMessages,
    status,
    sendMessage,
    setMessages,
  } = useChat({
    id,
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
    }),
    onFinish: ({ message }) => {
      const responseTime = requestStartTime.current
        ? Date.now() - requestStartTime.current
        : null;
      requestStartTime.current = null;


      // Extract text from parts
      const text = message.parts
        ?.map((part) => (part.type === "text" ? part.text : ""))
        .join("") || "";

      const meta = message.metadata as { usage?: LanguageModelUsage } | undefined;

      const assistantMessage: Message = {
        id: message.id,
        role: "assistant",
        content: text,
        metadata: {
          responseTime: responseTime ?? undefined,
          usage: meta?.usage,
        },
      };

      addMessage(id, assistantMessage);
    },
    onError: (error) => {
      requestStartTime.current = null;
      console.error(
        "Error while generating response for conversation",
        id,
        error,
      );
      toast.error("Error while generating response. Please try again.", {
        description: error.message,
      });
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Get the streaming assistant message text (only while actively streaming, not while submitted/waiting)
  const streamingText = status === "streaming"
    ? chatMessages
        .filter((m) => m.role === "assistant")
        .at(-1)
        ?.parts?.map((part) => (part.type === "text" ? part.text : ""))
        .join("") || ""
    : null;

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

        const toUIMessage = (m: Message) => ({
          id: m.id || Date.now().toString(),
          role: m.role as "system" | "user" | "assistant",
          parts: [
            {
              type: "text" as const,
              text: typeof m.content === "string" ? m.content : "",
            },
          ],
        });

        const bodyOptions = {
          body: {
            provider: currentConversation.provider,
            model: currentConversation.model,
            max_tokens: currentState.maxTokens,
            temperature: currentState.temperature,
            reasoningEffort: currentConversation.reasoningEffort,
          },
        };

        // Set history (all except last), then send the last message
        const history = messages.slice(0, -1);
        const lastMessage = messages.at(-1);

        setMessages(history.map(toUIMessage));

        if (lastMessage) {
          const text = typeof lastMessage.content === "string"
            ? lastMessage.content
            : "";
          sendMessage({ text }, bodyOptions);
        }

        requestStartTime.current = Date.now();
      }
    });
  }, [id, systemPrompt, systemPromptVars, setMessages, sendMessage]);

  useEffect(() => {
    updateConversation(id, { isLoading });
  }, [id, updateConversation, isLoading]);



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
          <Input
            type="text"
            placeholder="Provider"
            value={currentConversation.provider ?? defaultConversationConfig.provider}
            onChange={(e) => {
              updateConversation(id, { provider: e.currentTarget.value });
            }}
            className="w-24 invalid:border-red-500 bg-input/25"
            minLength={1}
            required
          />

          <Select
            value={currentConversation.provider ?? defaultConversationConfig.provider}
            onValueChange={(value) => {
              updateConversation(id, { provider: value });
            }}
          >
            <SelectTrigger className="w-max">
              {/* <SelectValue /> */}
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
              {getModelNames(
                currentConversation.provider ??
                  defaultConversationConfig.provider
              ).map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isReasoningModel(currentConversation.provider, currentConversation.model) && (
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
          )}
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
        {currentConversation.messages.length === 0 && !streamingText ? (
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
                      title="Token usage (input/output)"
                    >
                      <Sigma className="h-3 w-3" />
                      {message.metadata.usage.totalTokens || 0}
                      {message.metadata.usage.inputTokens != null &&
                        message.metadata.usage.outputTokens != null && (
                          <span className="text-xs opacity-70">
                            ({message.metadata.usage.inputTokens}/
                            {message.metadata.usage.outputTokens})
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

        {/* Streaming assistant message */}
        {streamingText ? (
          <div className="mb-4 flex flex-row items-end gap-2 justify-start">
            <div className="flex basis-3/4 flex-col items-stretch justify-start gap-2">
              <span className="h-auto w-max gap-2 text-xs/none font-medium px-1">
                assistant
              </span>
              <Textarea
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }
                }}
                value={streamingText}
                readOnly
                className="message-textarea resize-none overflow-hidden w-full rounded-lg border p-4 text-sm bg-secondary text-secondary-foreground"
              />
            </div>
          </div>
        ) : null}

        {isLoading && !streamingText ? (
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
