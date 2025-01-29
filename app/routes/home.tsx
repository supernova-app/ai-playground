import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "~/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
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
import {
  ListRestart,
  Plus,
  Settings,
  Maximize2,
  Minimize2,
  Zap,
  Archive,
  Variable,
  Code,
} from "lucide-react";
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
        window.innerHeight * 0.2,
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
        })),
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
      conversations.map((conversation) => ({ ...conversation, messages: [] })),
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
      dataStr,
    )}`;
    const exportFileDefaultName = "test-cases.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    if (!editorContainerRef.current) return;

    try {
      if (!isFullscreen) {
        await editorContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    document.querySelectorAll(".message-textarea").forEach((textarea) => {
      (textarea as HTMLTextAreaElement).style.height = "auto";
      (textarea as HTMLTextAreaElement).style.height =
        `${textarea.scrollHeight}px`;
    });
  }, [conversations]);

  return (
    <div className="flex h-screen w-full flex-col items-stretch justify-start">
      <AuthDialog />

      <div className="flex flex-row items-center justify-between gap-2 p-4">
        <div className="flex flex-row items-center justify-start gap-2">
          <img src="/logo.svg" alt="Supernova AI Logo" width={24} height={24} />

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

          <Link
            to="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            (Privacy Policy)
          </Link>
        </div>

        <div className="flex flex-row items-center justify-end gap-2">
          <Button
            onClick={handleClearChat}
            variant="destructive"
            size="icon"
            title="Clear All"
          >
            <ListRestart className="h-4 w-4" />
          </Button>

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
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="secondary" title="Settings">
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
          <Button
            onClick={addConversation}
            size="icon"
            title="New Conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <main className="flex-1 gap-4 overflow-auto p-4 pt-0">
        <div className="grid gap-2 sticky top-0 bg-background z-10">
          <div className="flex flex-row items-center justify-between">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <span className="scale-75">⌘+⇧+P</span>
          </div>

          <div
            className="relative group min-h-32 max-h-[50vh] resize-y overflow-y-auto"
            ref={editorContainerRef}
          >
            {/* <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-2 opacity-50 group-hover:opacity-100 transition-opacity z-10"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button> */}

            <Editor
              className={cn("h-full border overflow-y-auto", {
                "!fixed !inset-0 !z-50 !h-screen !w-screen !border-none":
                  isFullscreen,
              })}
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
                autoDetectHighContrast: false,
              }}
              onMount={(editor, monaco) => {
                // Add command palette keyboard binding
                editor.addCommand(
                  monaco.KeyMod.CtrlCmd |
                    monaco.KeyMod.Shift |
                    monaco.KeyCode.KeyP,
                  () => {
                    editor.trigger(
                      "keyboard",
                      "editor.action.quickCommand",
                      null,
                    );
                  },
                );
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
                <span className="scale-75">⌘+⏎</span>
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
    <DialogContent className="">
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

      <DialogFooter>
        <DialogClose asChild>
          <Button>Ok</Button>
        </DialogClose>
      </DialogFooter>
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
    <Dialog open={shouldShowDialog}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-auto">
        <div className="flex flex-col items-center space-y-8 p-4">
          {/* Logo & Title */}
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="Supernova AI Logo"
                width={40}
                height={40}
              />
              <h1 className="text-2xl font-bold">Supernova AI Playground</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Open Source
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Free to Use
              </span>
            </div>
          </div>

          {/* Auth Section */}
          <div className="w-full max-w-sm space-y-4">
            {isAuthCheckPending || isLoggingIn ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground animate-pulse">
                  {isAuthCheckPending
                    ? "Checking authentication..."
                    : "Logging in..."}
                </p>
              </div>
            ) : !authData ? (
              <Button
                onClick={handleGoogleLogin}
                className="w-full"
                variant="default"
                size="lg"
              >
                <img
                  height="24"
                  width="24"
                  src="https://cdn.simpleicons.org/google/fff"
                />
                Continue with Google
              </Button>
            ) : null}

            {authError && (
              <p className="text-sm text-destructive text-center">
                Authentication error. Please try again.
              </p>
            )}
          </div>

          {/* Footer Links */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              to="/privacy"
              className="hover:text-foreground transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              Privacy Policy
            </Link>
            <Link
              to="https://github.com/supernova-app/ai-playground"
              className="hover:text-foreground transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              GitHub Repository
            </Link>
          </div>

          {/* Main Content */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">
              Test Your Prompts Across Multiple AI Models
            </h2>
            <p className="text-muted-foreground max-w-lg">
              Compare responses from different AI models side-by-side, store
              test cases, and iterate on your prompts faster with our open
              source playground.
            </p>

            {/* Key Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-lg mx-auto !mt-8">
              <div className="flex items-start gap-2">
                <div className="rounded-full p-2 bg-primary/10">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Side-by-Side Testing</h3>
                  <p className="text-sm text-muted-foreground">
                    Compare responses from multiple models simultaneously
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="rounded-full p-2 bg-primary/10">
                  <Archive className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Test Case Storage</h3>
                  <p className="text-sm text-muted-foreground">
                    Save and reuse your test scenarios
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="rounded-full p-2 bg-primary/10">
                  <Variable className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Variable System Prompts</h3>
                  <p className="text-sm text-muted-foreground">
                    Test different system prompts easily
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="rounded-full p-2 bg-primary/10">
                  <Code className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Developer Friendly</h3>
                  <p className="text-sm text-muted-foreground">
                    Built for developers, by developers
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Video */}
          <div className="w-full aspect-video rounded-lg overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/I01_t75FT-c"
              title="Supernova AI Playground Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="border-0"
            ></iframe>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
