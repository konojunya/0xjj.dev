import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

export default defineConfig({
  resolve: {
    alias: {
      "react-server-dom-webpack/client.edge":
        "react-server-dom-webpack/cjs/react-server-dom-webpack-client.edge.production.js",
    },
  },
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: { dark: "github-dark", light: "github-light" },
              keepBackground: false,
            },
          ],
        ],
      }),
    },
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
