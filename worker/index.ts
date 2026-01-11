import { Hono } from "hono";
import { chat } from "./usecase/chat";

const app = new Hono<{ Bindings: Env }>();

app.post("/api/chat", chat);
app.all("*", (c) => c.notFound());

export default app;
