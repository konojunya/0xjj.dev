import {inferAsyncReturnType, initTRPC} from '@trpc/server';
import {createHTTPServer} from '@trpc/server/adapters/standalone';

function createContext() {
  return {};
}

type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();

const appRouter = t.router({
  hello: t.procedure
    // .input(
    //   z.object({
    //     name: z.string(),
    //   })
    // )
    .query(() => `Hello`),
});

export type AppRouter = typeof appRouter;

const {listen} = createHTTPServer({
  router: appRouter,
  createContext,
});

const {port} = listen(Number.parseInt(process.env.PORT || '8080'));
// eslint-disable-next-line no-console
console.log(`Listen on http://localhost:${port}`);
