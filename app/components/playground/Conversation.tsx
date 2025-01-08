import { useEffect } from "react";
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
import { useChat } from "ai/react";
import { ClipboardCopy, Copy, Trash } from "lucide-react";
import { toast } from "sonner";

import { useConversation, usePlaygroundStore } from "~/contexts/store";
import {
  defaultConversationConfig,
  modelSuggestions,
  roles,
  SUPPORTED_PROVIDER_KEYS,
  type Message,
  type SUPPORTED_PROVIDER_KEY,
} from "~/config/ai";
import { injectVarsIntoTemplate } from "~/lib/variables";
import { cn, seededRandomBackground } from "~/lib/utils";

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

  const currentConversation = useConversation(id);

  const { isLoading, setMessages, reload } = useChat({
    id,
    api: "/api/ai/chat",
    generateId: () => Date.now().toString(),
    onFinish: (message) => {
      addMessage(id, message as Message);

      // scroll to bottom
      document.body.scrollIntoView({ behavior: "smooth", block: "end" });
    },
    body: {
      provider: currentConversation.provider,
      model: currentConversation.model,
      max_tokens: maxTokens,
      temperature,
    },
    onError: (error) => {
      console.error(
        "Error while generating response for conversation",
        id,
        error
      );

      toast.error("Error while generating response. Please try again.", {
        description: error.message,
      });
    },
  });

  const handleCopyResponse = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.info("Response copied to clipboard!");
  };

  useEffect(() => {
    return usePlaygroundStore.subscribe((currentState, prevState) => {
      const currentConversation = currentState.conversations.find(
        (conv) => conv.id === id
      )!;

      if (currentState.runs.length !== prevState.runs.length) {
        setMessages(
          // @ts-ignore TODO
          systemPrompt
            ? [
                {
                  id: Date.now().toString(),
                  role: "system" as const,
                  content: injectVarsIntoTemplate(
                    systemPrompt,
                    systemPromptVars
                  ),
                } as Message,
                ...currentConversation.messages,
              ]
            : currentConversation.messages
        );

        reload();
      }
    });
  }, [id, systemPrompt, setMessages, reload, systemPromptVars]);

  useEffect(() => {
    updateConversation(id, { isLoading });
  }, [id, updateConversation, isLoading]);

  return (
    <div
      key={id}
      className={cn(
        "flex min-h-[75vh] flex-1 flex-col rounded-lg p-4 border-4",
        seededRandomBackground(
          currentConversation.provider + ":" + currentConversation.model
        )
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
                provider: value as SUPPORTED_PROVIDER_KEY,
              });
            }}
            required
          >
            <SelectTrigger className="w-max bg-input/25">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_PROVIDER_KEYS.map((provider) => (
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
              {modelSuggestions[
                currentConversation.provider ??
                  defaultConversationConfig.provider
              ]?.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
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

              <Textarea
                value={message.content as string}
                onChange={(e) => {
                  updateMessage(id, message.id!, {
                    content: e.currentTarget.value,
                  });

                  e.currentTarget.style.height = "auto";
                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                }}
                className={`message-textarea w-full rounded-lg border p-4 text-sm ${
                  message.role === "user"
                    ? "bg-secondary/50 text-secondary-foreground"
                    : message.role === "system"
                    ? "bg-green-50"
                    : "bg-secondary text-secondary-foreground"
                }`}
              />
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
