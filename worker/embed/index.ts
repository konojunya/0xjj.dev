import type { MarkdownChunk } from "../chunk";

const EMBED_BATCH = 64;

export async function embedText(
  env: Env,
  texts: string[],
): Promise<number[][]> {
  const out: Ai_Cf_Baai_Bge_Base_En_V1_5_Output = await env.AI.run(
    "@cf/baai/bge-base-en-v1.5",
    { text: texts },
  );
  return "data" in out ? (out.data ?? []) : [];
}

export async function embedInBatches(env: Env, texts: MarkdownChunk[]) {
  const all: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const batchTexts = batch.map((c) =>
      [...c.headingPath, "", c.body].join("\n"),
    );
    const vecs = await embedText(env, batchTexts);
    all.push(...vecs);
  }
  return all;
}
