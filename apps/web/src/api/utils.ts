import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../server/router";

export const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `http://localhost:8080/trpc`,
    }),
  ],
});
