import { revalidateTag } from "next/cache";
import crypto from "node:crypto";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MICROCMS_PURGE_SECRET: string;
    }
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const purgeSecret = process.env.MICROCMS_PURGE_SECRET;
  const expected = crypto
    .createHmac("sha256", purgeSecret)
    .update(body)
    .digest("hex");
  const signature = request.headers.get("x-microcms-signature");
  if (!signature) {
    throw new Error("Signature is required");
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid signature");
  }

  revalidateTag("jobs");
  return new Response("OK", { status: 200 });
}
