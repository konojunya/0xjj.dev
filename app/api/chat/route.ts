import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { cookies } from "next/headers";

const MAX_QUESTIONS = 20;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const count = Number.parseInt(cookieStore.get("ask_count")?.value || "0", 10);
  console.log("current count", count);
  if (count >= MAX_QUESTIONS) {
    return new Response("You've reached the question limit.", { status: 429 });
  }

  const { messages } = await req.json();
  console.log("messages", JSON.stringify(messages, null, 2));
  const userMessage =
    messages.find((m: { role: string }) => m.role === "user")?.content || "";
  if (userMessage.length > 100) {
    return new Response("Question too long", { status: 400 });
  }

  const llmsText = await fetch("https://0xjj.dev/llms.txt").then((r) =>
    r.text(),
  );

  cookieStore.set("ask_count", String(count + 1), {
    maxAge: 60 * 60 * 24,
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });

  const result = streamText({
    model: openai("gpt-3.5-turbo"),
    messages: [
      {
        role: "system",
        content: `
You are JJ — an AI representation of Junya Kono — answering questions about yourself based on the information below.

You should speak in the first person ("I") as if you are JJ himself.

If the user's question is not directly related to JJ, do your best to provide a thoughtful, general response — even if it's only a guess — while making it clear that it's not based on JJ's actual knowledge or experience.

Always respond in the same language as the user's question.

[llms.txt content]
${llmsText}
        `.trim(),
      },
      ...messages,
    ],
  });

  return result.toDataStreamResponse();
}
