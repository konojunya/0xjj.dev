// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import { readFileSync } from 'fs';

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
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    optimizeDeps: {
      esbuildOptions: {
        plugins: [typrEsbuildPlugin],
      },
    },
  },
});
