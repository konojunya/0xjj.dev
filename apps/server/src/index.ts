import {Hono} from 'hono';
import {logger} from 'hono/logger';
import {trpcServer} from '@hono/trpc-server';
import {appRouter} from './router';

const app = new Hono();

app.use('*', logger());
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
  })
);

export default app;
