import { c as createAstro, a as createComponent, r as renderTemplate, b as renderHead } from '../astro.b85d630e.mjs';
import 'html-escaper';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

const client = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: `http://localhost:8080`
    })
  ]
});

const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  -console.log("Hello in ternminal");
  console.log(await client.hello.query({ name: "hello" }));
  return renderTemplate`<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JJ</title>
${renderHead($$result)}</head>
<body>
  <h1>hello</h1> 
</body></html>`;
}, "/Users/konojunya/.ghq/src/github.com/konojunya/0xjj.dev/apps/web/src/pages/index.astro");

const $$file = "/Users/konojunya/.ghq/src/github.com/konojunya/0xjj.dev/apps/web/src/pages/index.astro";
const $$url = "";

const _page0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

export { _page0 as _ };
