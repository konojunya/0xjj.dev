// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import { readFileSync } from 'fs';
import rehypeShiftHeading from 'rehype-shift-heading';
import { remarkCodeMeta } from './src/plugins/remark-code-meta.mjs';
import { remarkZennMessage } from './src/plugins/remark-zenn-message.mjs';
import { rehypeExternalLinks } from './src/plugins/rehype-external-links.mjs';
import remarkDirective from 'remark-directive';
import sitemap from '@astrojs/sitemap';

/** @type {import('esbuild').Plugin} */
const typrEsbuildPlugin = {
  name: 'typr-cjs-shim',
  setup(build) {
    build.onLoad({ filter: /typr\.js[/\\]index\.js$/ }, (args) => {
      const src = readFileSync(args.path, 'utf8');
      return {
        contents: src + '\nmodule.exports = Typr;\n',
        loader: 'js',
      };
    });
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://0xjj.dev',
  trailingSlash: 'always',
  integrations: [react(), sitemap()],
  markdown: {
    remarkPlugins: [remarkDirective, remarkZennMessage, remarkCodeMeta],
    rehypePlugins: [[rehypeShiftHeading, { shift: 1 }], rehypeExternalLinks],
    shikiConfig: {
      transformers: [
        {
          name: 'code-filename',
          pre(node) {
            const meta = this.options.meta?.__raw ?? '';
            const match = meta.match(/filename="([^"]+)"/);
            if (!match) return;
            const filename = match[1];
            node.properties['data-has-filename'] = true;
            node.children.unshift({
              type: 'element',
              tagName: 'span',
              properties: { className: ['code-filename'] },
              children: [{ type: 'text', value: filename }],
            });
          },
        },
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    optimizeDeps: {
      esbuildOptions: {
        plugins: [typrEsbuildPlugin],
      },
    },
  },
});
