import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { ListRestart, Plus, Settings } from "lucide-react";
import { usePlaygroundStore } from "~/contexts/store";
import { Conversation } from "~/components/playground/Conversation";
import { roles, type Message } from "~/config/ai";
import { authClient } from "~/lib/auth-client";
import { toast } from "sonner";

import Editor from "@monaco-editor/react";
import { Link } from "react-router";

export function meta() {
  return [
    { title: "Supernova — AI Playground" },
    {
      name: "description",
      content:
        "Test your prompts across multiple AI models simultaneously with our open source playground. Evaluate responses side-by-side and store test cases for future testing.",
    },
  ];
}

// makes this route client-only
export function clientLoader() {
  return null;
}

export default function Home() {
  const { data: authData } = authClient.useSession();

  const {
    addRun,
    systemPrompt,
    systemPromptVars,
    conversations,
    inputMessage,
    inputRole,
    temperature,
    maxTokens,
    syncDelete,
    testCases,
    setSystemPrompt,
    setConversations,
    addConversation,
    setInputMessage,
    setInputRole,
    setTemperature,
    setMaxTokens,
    setSyncDelete,
    removeTestCase,
  } = usePlaygroundStore();

  const isLoading = conversations.some((conv) => conv.isLoading);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        window.innerHeight * 0.2
      )}px`;
    }
  }, [inputMessage]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    if (inputMessage.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        role: inputRole,
        content: inputMessage,
      };

      setConversations(
        conversations.map((conversation) => ({
          ...conversation,
          messages: [...conversation.messages, newMessage],
        }))
      );

      addRun();

      setInputMessage("");
    } else {
      // this will trigger a reload
      addRun();
    }
  };

  const handleClearChat = () => {
    setConversations(
      conversations.map((conversation) => ({ ...conversation, messages: [] }))
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleDownloadTestCases = () => {
    const dataStr = JSON.stringify(testCases, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;
    const exportFileDefaultName = "test-cases.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  useEffect(() => {
    document.querySelectorAll(".message-textarea").forEach((textarea) => {
      (textarea as HTMLTextAreaElement).style.height = "auto";
      (
        textarea as HTMLTextAreaElement
      ).style.height = `${textarea.scrollHeight}px`;
    });
  }, [conversations]);

  return (
    <div className="flex h-screen w-full flex-col items-stretch justify-start">
      <AuthDialog />

      <div className="flex flex-row items-center justify-between gap-2 p-4">
        <div className="flex flex-row items-center justify-start gap-2">
          <img
            src="/public/logo.svg"
            alt="Supernova AI Logo"
            width={24}
            height={24}
          />

          <p className="text-xl/none font-semibold text-primary">
            <Link
              to="https://www.getsupernova.ai"
              target="_blank"
              rel="noreferrer"
              className="font-black"
            >
              Supernova
            </Link>{" "}
            — AI Playground
          </p>

          {authData ? (
            <p className="text-sm font-medium text-muted-foreground">
              [{authData.user.name ?? authData.user.email}] —{" "}
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto"
                onClick={() => authClient.signOut()}
              >
                Logout
              </Button>
            </p>
          ) : null}
        </div>

        <div className="flex flex-row items-center justify-end gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Test Cases</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Test Cases</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto">
                <Accordion type="single" collapsible className="w-full">
                  {testCases.map((testCase, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger>Test Case {index + 1}</AccordionTrigger>
                      <AccordionContent>
                        <div className="prose prose-sm prose-neutral prose-purple">
                          <Button
                            onClick={() => removeTestCase(index)}
                            variant="destructive"
                            size="sm"
                            className="ml-auto"
                          >
                            Delete
                          </Button>

                          <pre>{JSON.stringify(testCase, null, 2)}</pre>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {testCases.length === 0 ? (
                <p className="text-center text-lg font-medium">
                  No test cases found
                </p>
              ) : (
                <Button onClick={handleDownloadTestCases}>
                  Download .json
                </Button>
              )}
            </DialogContent>
          </Dialog>
          <Button onClick={handleClearChat} variant="destructive" size="icon">
            <ListRestart className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="secondary">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Adjust the global settings.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="max_tokens">Max Tokens</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    value={maxTokens}
                    min={1}
                    max={4096 * 2}
                    step={256}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    value={temperature}
                    min={0}
                    max={1}
                    step={0.1}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sync-delete">Sync Delete</Label>
                  <Switch
                    id="sync-delete"
                    checked={syncDelete}
                    onCheckedChange={(checked) => setSyncDelete(checked)}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={addConversation} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <main className="flex-1 gap-4 overflow-auto p-4 pt-0">
        <div className="grid gap-2 sticky top-0 bg-background z-10">
          <Label htmlFor="system-prompt">System Prompt</Label>

          <div className="min-h-32 resize-y overflow-y-auto">
            <Editor
              className="h-full border overflow-y-auto"
              defaultValue={systemPrompt}
              language="html"
              onChange={(value) => setSystemPrompt(value || "")}
              options={{
                theme: "vs-light",
                placeholder: "Enter system prompt here...",
                fontFamily: "JetBrains Mono",
                fontSize: 12,
                lineHeight: 1.7,
                tabSize: 2,
                wordWrap: "on",
                bracketPairColorization: {
                  enabled: true,
                },
                renderWhitespace: "all",
                renderLineHighlight: "gutter",
                minimap: { enabled: false },
                dragAndDrop: true,
                automaticLayout: true,
              }}
            />
          </div>

          <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-0.5 pb-2 border-b">
            {Object.entries(systemPromptVars).map(([varName]) => (
              <Dialog key={varName}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <code className="text-xs">{varName}</code>
                  </Button>
                </DialogTrigger>

                <UpdateVariableDialog name={varName} />
              </Dialog>
            ))}

            {!Object.entries(systemPromptVars).length ? (
              <p className="text-xs font-medium text-muted-foreground">
                Tip: Try adding some variables to your system prompt using{" "}
                <code className="text-xs">{"{{var_name}}"}</code> syntax
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-row items-stretch justify-start gap-4 mt-2 overflow-x-auto">
          {conversations.map((conversation) => (
            <Conversation key={conversation.id} id={conversation.id} />
          ))}
        </div>

        <form
          onSubmit={handleSendMessage}
          className="sticky bottom-0 mx-auto mt-4 max-w-5xl shrink-0 overflow-hidden rounded-lg ring-1 ring-border bg-card focus-within:ring-ring"
        >
          <fieldset disabled={isLoading}>
            <Label htmlFor="message" className="sr-only">
              Message
            </Label>

            <Textarea
              ref={textareaRef}
              id="message"
              placeholder="Type your message here..."
              className="min-h-12 flex-1 resize-none border-0 p-3 shadow-none focus-visible:ring-0 bg-input/50"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ maxHeight: "20vh" }}
              autoFocus
            />

            <div className="flex items-center justify-between px-3 py-2">
              <Select
                value={inputRole}
                onValueChange={(value) =>
                  setInputRole(value as Message["role"])
                }
              >
                <SelectTrigger className="w-max">
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

              <Button type="submit" size="sm" className="ml-2 gap-1.5">
                <span>Send</span>
                <span className="scale-75">⌘+k</span>
              </Button>
            </div>
          </fieldset>
        </form>
      </main>
    </div>
  );
}

type VariableInputProps = {
  name: string;
};

function UpdateVariableDialog({ name }: VariableInputProps) {
  const { systemPromptVars, updateSystemPromptVar } = usePlaygroundStore();

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          Update Variable <code>{name}</code>
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-2">
        <Textarea
          value={systemPromptVars[name]}
          onChange={(e) => updateSystemPromptVar(name, e.target.value)}
          rows={10}
        />
      </div>
    </DialogContent>
  );
}
function AuthDialog() {
  const {
    data: authData,
    isPending: isAuthCheckPending,
    error: authError,
  } = authClient.useSession();

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Show dialog while checking auth or when not authenticated
  const shouldShowDialog = isAuthCheckPending || !authData;

  async function handleGoogleLogin() {
    try {
      setIsLoggingIn(true);

      const response = await authClient.signIn.social({
        provider: "google",
      });

      if (response.error) {
        throw new Error(response.error.message, {
          cause: response.error,
        });
      }
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <Dialog open={shouldShowDialog} modal>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center">
            {isAuthCheckPending
              ? "Checking authentication..."
              : isLoggingIn
              ? "Logging in..."
              : "Please Authenticate"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-4 py-4">
          {isAuthCheckPending || isLoggingIn ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">Please wait...</p>
            </div>
          ) : !authData ? (
            <Button onClick={handleGoogleLogin} className="w-full max-w-sm">
              Login with Google
            </Button>
          ) : null}

          {authError ? (
            <p className="text-sm text-destructive">
              Authentication error. Please try again.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
