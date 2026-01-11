import { Hono } from "hono";
import { chat } from "./usecase/chat";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";

// do
import { IpRateLimiter } from "./do/ipRateLimiter";
import { upsertBlogIndex } from "./usecase/upsertBlogIndex";

const app = new Hono<{ Bindings: Env }>();

// middleware
app.use(logger());
app.use("*", requestId());
app.use(csrf());
app.use(secureHeaders());

app.use("/api/*", cors());
app.post("/api/chat", chat);
app.post("/api/admin/index/:slug", upsertBlogIndex);
app.all("*", (c) => c.notFound());

export default app;
export { IpRateLimiter };
