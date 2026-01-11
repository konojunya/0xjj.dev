import type { UIMessage } from "ai";
import { nanoid } from "nanoid";

interface MessageType {
  key: string;
  from: "user" | "assistant";
  versions: {
    id: string;
    content: string;
  }[];
}

export function convertedMessages(messages: UIMessage[]): MessageType[] {
  return messages.map((msg: UIMessage) => {
    const textParts = msg.parts.filter((p) => p.type === "text");
    const textContent = textParts.map((p) => p.text).join("");

    return {
      key: msg.id || nanoid(),
      from: msg.role as "user" | "assistant",
      versions: [
        {
          id: msg.id || nanoid(),
          content: textContent,
        },
      ],
    };
  });
}
