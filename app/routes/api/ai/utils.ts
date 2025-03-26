import type { Message } from "~/config/ai";

export type PreparedMessage = Pick<Message, "role"> & {
  content: string;
};

/**
 * The input can contain images, files and much more but we only support text for now
 */
export function prepareMessages(messages: Message[]) {
  return messages
    .map((message) => {
      // Handle string content
      if (typeof message.content === "string") {
        return message as PreparedMessage;
      }

      // Handle array content (text + images)
      if (Array.isArray(message.content)) {
        // For multimodal content, keep the original format
        // This allows each provider to handle it according to their requirements
        return {
          role: message.role,
          content: message.content,
        };
      }

      return null;
    })
    .filter(function <T>(message: T | null): message is T {
      return Boolean(message);
    });
}
