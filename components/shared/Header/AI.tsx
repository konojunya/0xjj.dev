"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Orb from "@/components/shared/bits/Orb";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@ai-sdk/react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import z from "zod";
import { toast } from "sonner";

const schema = z.object({
  question: z.string().min(1).max(100),
});

export const AI: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const moveToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    onFinish: moveToBottom,
    onError: (error) => {
      setError(error);
    },
  });

  return (
    <Drawer direction="bottom">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Orb
            hoverIntensity={0.5}
            rotateOnHover={true}
            hue={0}
            forceHoverState={false}
          />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-4/5 lg:h-3/5">
        <DrawerHeader>
          <DrawerTitle>Any questions for JJ?</DrawerTitle>
          <DrawerDescription>
            Tech? Life in Tokyo? Favorite snack while coding? Ask away.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-2 bg-muted py-4">
          <div className="container">
            {messages.length === 0 && (
              <div className="flex flex-col gap-4">
                {[
                  { role: "user", content: "What's your name?" },
                  { role: "assistant", content: "Hello, I'm JJ.\nI can help you with anything you need." },
                  { role: "user", content: "どんな気分ですか？" },
                  { role: "assistant", content: "あなたに出会えてとても嬉しいです！" },
                ].map((m, i) => (
                  <div
                    key={`placeholder-${m.role}-${i}`}
                      className={cn(
                        "whitespace-pre-wrap p-2 rounded-md max-w-[80%] w-fit",
                        m.role === "user"
                          ? "bg-foreground/60 text-background self-end"
                          : "bg-foreground/60 text-background self-start",
                      )}
                    >
                      <strong>{m.role === "user" ? "You" : "JJ"}:</strong>{" "}
                      {m.content}
                    </div>
                  ),
                )}
              </div>
            )}
            <div className="flex flex-col gap-4">
              {messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={cn(
                    "whitespace-pre-wrap p-2 rounded-md max-w-[80%] w-fit",
                    m.role === "user"
                      ? "bg-foreground text-background self-end"
                      : "bg-background self-start",
                  )}
                >
                  <strong>{m.role === "user" ? "You" : "JJ"}:</strong>{" "}
                  {m.content}
                </div>
              ))}
            </div>

            {status === "submitted" && (
              <div className="flex items-center space-x-1 text-sm text-muted-foreground px-2">
                <strong>JJ:</strong>
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-150">.</span>
                <span className="animate-bounce delay-300">.</span>
              </div>
            )}

            {/* limit exceeded */}
            {error?.message.includes("limit") && (
              <p className="text-sm text-red-500 px-2 my-4">
                You've asked quite a few questions!{" "}
                <a
                  href="https://x.com/0xjj_official"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Let’s talk directly instead.
                </a>
              </p>
            )}

            {/* question too long */}
            {error?.message.includes("too long") && (
              <p className="text-sm text-red-500 px-2 my-4">
                Question too long. Try again.
              </p>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>
        <DrawerFooter>
          <form
            className="flex flex-col gap-4 container"
            onSubmit={(e) => {
              e.preventDefault();
              const result = schema.safeParse({ question: input });
              if (!result.success) {
                toast.error("Invalid question");
                return;
              }

              handleSubmit(e);
              moveToBottom();
            }}
          >
            <Textarea
              placeholder="Type your question here..."
              value={input}
              onChange={handleInputChange}
              rows={3}
              className="resize-none"
            />

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={status === "streaming"}>
                {status === "streaming" ? "JJ is typing..." : "Submit"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </div>
          </form>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
