import { s as server_default } from './chunks/astro.b85d630e.mjs';
import { _ as _page0 } from './chunks/pages/all.6b19eaa1.mjs';
import 'html-escaper';
import '@trpc/client';

const pageMap = new Map([["src/pages/index.astro", _page0],]);
const renderers = [Object.assign({"name":"astro:jsx","serverEntrypoint":"astro/jsx/server.js","jsxImportSource":"astro"}, { ssr: server_default }),];

export { pageMap, renderers };
