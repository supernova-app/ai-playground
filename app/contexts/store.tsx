import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  defaultConversationConfig,
  type Conversation,
  type Message,
} from "~/config/ai";
import { extractVariablesFromTemplate } from "~/lib/variables";

type Theme = "light" | "dark";

type PlaygroundStore = {
  theme: Theme;

  runs: number[];

  systemPrompt: string;
  systemPromptVars: Record<string, string>;

  conversations: Conversation[];

  inputMessage: string;
  inputRole: Message["role"];

  temperature: number;
  maxTokens: number;
  syncDelete: boolean;

  testCases: {
    system_prompt?: string | null;
    vars: Record<string, string>;
    messages: Conversation["messages"];
  }[];

  setTheme: (theme: Theme) => void;

  addRun: () => void;

  setSystemPrompt: (prompt: string) => void;
  setSystemPromptVars: (vars: Record<string, string>) => void;
  updateSystemPromptVar: (varName: string, value: string) => void;

  setConversations: (conversations: Conversation[]) => void;

  setInputMessage: (inputMessage: string) => void;
  setInputRole: (inputRole: Message["role"]) => void;

  setTemperature: (temperature: number) => void;
  setMaxTokens: (maxTokens: number) => void;
  setSyncDelete: (syncDelete: boolean) => void;

  // setTestCases: (testCases: Conversation[]) => void;

  addConversation: () => void;
  removeConversation: (id: string) => void;
  updateConversation: (id: string, conversation: Partial<Conversation>) => void;
  duplicateConversation: (id: string) => void;

  addMessage: (conversationId: string, message: Message) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    message: Partial<Message>,
  ) => void;

  addTestCase: (conversation: Conversation) => void;
  removeTestCase: (testCaseIndex: number) => void;
};

export const usePlaygroundStore = create<PlaygroundStore>((set) => ({
  theme: "light",

  runs: [],

  systemPrompt: "",
  systemPromptVars: {},

  conversations: [
    {
      id: Date.now().toString(),
      provider: defaultConversationConfig.provider,
      model: defaultConversationConfig.model,
      messages: [],
      isLoading: false,
      createdAt: new Date(),
    },
    {
      id: (Date.now() + 1).toString(),
      provider: "openai",
      model: "gpt-4o",
      messages: [],
      isLoading: false,
      createdAt: new Date(),
    },
  ],

  inputMessage: "",
  inputRole: "user" as const,

  temperature: 0.7,
  maxTokens: 1024,
  syncDelete: true,

  testCases: [],

  setTheme: (theme: Theme) => {
    set({ theme });
  },

  addRun: () => set((state) => ({ runs: [...state.runs, Date.now()] })),

  setSystemPrompt: (prompt) =>
    set((state) => ({
      systemPrompt: prompt,
      systemPromptVars: extractVariablesFromTemplate(
        prompt,
        state.systemPromptVars,
      ),
    })),
  setSystemPromptVars: (vars) => set({ systemPromptVars: vars }),
  updateSystemPromptVar: (varName, value) =>
    set((state) => ({
      systemPromptVars: { ...state.systemPromptVars, [varName]: value },
    })),

  setConversations: (conversations: Conversation[]) => set({ conversations }),

  setInputMessage: (inputMessage: string) => set({ inputMessage }),
  setInputRole: (inputRole: Message["role"]) => set({ inputRole }),

  setTemperature: (temperature: number) => set({ temperature }),
  setMaxTokens: (maxTokens: number) => set({ maxTokens }),
  setSyncDelete: (syncDelete: boolean) => set({ syncDelete }),

  // setTestCases: (testCases: Conversation[]) => set({ testCases }),

  addConversation: () =>
    set((state) => ({
      conversations: [
        ...state.conversations,
        {
          id: Date.now().toString(),
          provider: defaultConversationConfig.provider,
          model: defaultConversationConfig.model,
          messages: [],
          isLoading: false,
          createdAt: new Date(),
        },
      ],
    })),
  removeConversation: (id: string) =>
    set((state) => ({
      conversations: state.conversations.filter((conv) => conv.id !== id),
    })),
  updateConversation: (id: string, conversation: Partial<Conversation>) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, ...conversation } : conv,
      ),
    })),
  duplicateConversation: (id: string) =>
    set((state) => {
      const conversationToDuplicate = state.conversations.find(
        (conv) => conv.id === id,
      );
      if (!conversationToDuplicate) return state;

      // Generate new unique IDs for the duplicated messages
      const duplicatedMessages = conversationToDuplicate.messages.map(
        (message) => ({
          ...message,
          id: Date.now().toString(),
        }),
      );

      return {
        conversations: [
          ...state.conversations,
          {
            ...conversationToDuplicate,
            id: Date.now().toString(),
            messages: duplicatedMessages,
            createdAt: new Date(),
            isLoading: false,
          },
        ],
      };
    }),

  addMessage: (conversationId: string, message: Message) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, message] }
          : conv,
      ),
    })),
  removeMessage: (conversationId: string, messageId: string) =>
    set((state) => {
      if (state.syncDelete) {
        // delete the message from all conversations (should be same index and role)

        const currentConversation = state.conversations.find(
          (conv) => conv.id === conversationId,
        )!;

        const currentMessage = currentConversation.messages.find(
          (message) => message.id === messageId,
        )!;
        let currentMessageIndex = -1;

        for (let i = 0; i < currentConversation.messages.length; i++) {
          if (currentConversation.messages[i].id === currentMessage.id) {
            currentMessageIndex = i;
            break;
          }
        }

        return {
          conversations: state.conversations.map((conv) => ({
            ...conv,
            messages: conv.messages.filter(
              (_, index) => index !== currentMessageIndex,
            ),
          })),
        };
      } else {
        return {
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.filter(
                    (message) => message.id !== messageId,
                  ),
                }
              : conv,
          ),
        };
      }
    }),
  updateMessage: (
    conversationId: string,
    messageId: string,
    message: Partial<Message>,
  ) =>
    set((state) => {
      const updatedConversations = state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                messageId === msg.id
                  ? ({ ...msg, ...message } as Message)
                  : msg,
              ),
            }
          : conv,
      );
      return { conversations: updatedConversations };
    }),

  addTestCase: (conversation: Conversation) =>
    set((state) => ({
      testCases: [
        ...state.testCases,
        {
          messages: conversation.messages,
          system_prompt: state.systemPrompt ? state.systemPrompt : null,
          vars: state.systemPromptVars,
        },
      ],
    })),
  removeTestCase: (testCaseIndex: number) =>
    set((state) => ({
      testCases: state.testCases.filter((_, index) => index !== testCaseIndex),
    })),
}));

export function useConversation(id: string) {
  return usePlaygroundStore(
    useShallow((state) => state.conversations.find((c) => c.id === id)!),
  );
}
