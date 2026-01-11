import {
  MessageAction,
  MessageActions,
} from "@/components/ai-elements/message";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { MessageResponse } from "@/components/ai-elements/message";
import { useChat } from "@ai-sdk/react";
import { CopyIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Source, SourcesContent } from "./components/ai-elements/sources";
import { Sources, SourcesTrigger } from "./components/ai-elements/sources";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./components/ai-elements/reasoning";
import { Loader } from "./components/ai-elements/loader";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "./components/ai-elements/prompt-input";
import { useState } from "react";

export const ChatDialog = () => {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  const onSubmit = async (message: PromptInputMessage) => {
    await sendMessage({
      role: "user",
      parts: [{ type: "text" as const, text: message.text }],
    });

    setInput("");
  };

  return (
    <Dialog>
      <DialogTrigger>trigger</DialogTrigger>
      <DialogContent className="max-h-none h-full w-full max-w-none rounded-none">
        <DialogHeader>
          <DialogTitle>JJ AI</DialogTitle>
          <DialogDescription hidden />

          <div className="max-w-4xl mx-auto py-4 relative size-full h-screen pb-20">
            <div className="flex flex-col h-full">
              <Conversation className="h-full">
                <ConversationContent className="text-left p-0">
                  {messages.map((message) => (
                    <div key={message.id}>
                      {message.role === "assistant" &&
                        message.parts.filter(
                          (part) => part.type === "source-url",
                        ).length > 0 && (
                          <Sources>
                            <SourcesTrigger
                              count={
                                message.parts.filter(
                                  (part) => part.type === "source-url",
                                ).length
                              }
                            />
                            {message.parts
                              .filter((part) => part.type === "source-url")
                              .map((part, i) => (
                                <SourcesContent key={`${message.id}-${i}`}>
                                  <Source
                                    key={`${message.id}-${i}`}
                                    href={part.url}
                                    title={part.url}
                                  />
                                </SourcesContent>
                              ))}
                          </Sources>
                        )}
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case "text":
                            return (
                              <Message
                                key={`${message.id}-${i}`}
                                from={message.role}
                              >
                                <MessageContent>
                                  <MessageResponse>{part.text}</MessageResponse>
                                </MessageContent>
                                {message.role === "assistant" &&
                                  i === messages.length - 1 && (
                                    <MessageActions>
                                      <MessageAction
                                        onClick={() =>
                                          navigator.clipboard.writeText(
                                            part.text,
                                          )
                                        }
                                        label="Copy"
                                      >
                                        <CopyIcon className="size-3" />
                                      </MessageAction>
                                    </MessageActions>
                                  )}
                              </Message>
                            );
                          case "reasoning":
                            return (
                              <Reasoning
                                key={`${message.id}-${i}`}
                                className="w-full"
                                isStreaming={
                                  status === "streaming" &&
                                  i === message.parts.length - 1 &&
                                  message.id === messages.at(-1)?.id
                                }
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>{part.text}</ReasoningContent>
                              </Reasoning>
                            );
                          default:
                            return null;
                        }
                      })}
                    </div>
                  ))}
                  {status === "submitted" && <Loader />}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
              <PromptInput
                onSubmit={onSubmit}
                className="mt-4"
                globalDrop
                multiple
              >
                <PromptInputBody>
                  <PromptInputTextarea
                    onChange={(e) => setInput(e.target.value)}
                    value={input}
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputSubmit
                    disabled={!input && !status}
                    status={status}
                  />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
