import { Hono } from "hono";
import { chat } from "./usecase/chat";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { compress } from "hono/compress";

// do
import { IpRateLimiter } from "./do/ipRateLimiter";

const app = new Hono<{ Bindings: Env }>();

// middleware
app.use(logger());
app.use("*", requestId());
app.use(csrf());
app.use(secureHeaders());
app.use(compress());

app.use("/api/*", cors());
app.post("/api/chat", chat);
app.all("*", (c) => c.notFound());

export default app;
export { IpRateLimiter };
