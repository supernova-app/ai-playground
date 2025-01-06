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
      if (typeof message.content === "string") {
        return message as PreparedMessage;
      }

      return null;
    })
    .filter(function <T>(message: T | null): message is T {
      return Boolean(message);
    });
}
