# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun dev` - Start Astro dev server
- `bun run build` - Build for production
- `bun run preview` - Preview production build locally
- `bun run deploy` - Deploy Worker via Wrangler (when Worker is added)

## Architecture Overview

Personal portfolio/blog site for JJ (Junya Kono) — v4 is built with **Astro 5** + **Tailwind CSS v4**, deployed via **Cloudflare Workers** with Wrangler.

### Stack

- **Astro 5** with Vite — static site generation
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (no `tailwind.config.*` file needed)
- **Wrangler** for Cloudflare Workers deployment

### Key Files

| Path | Purpose |
|---|---|
| `src/layouts/Layout.astro` | Root HTML shell — imports `global.css`, sets `lang="ja"` |
| `src/styles/global.css` | Tailwind import + CSS variables (colors, fonts) + Google Fonts |
| `src/pages/index.astro` | Top page |
| `astro.config.mjs` | Astro config — registers `@tailwindcss/vite` plugin |
| `wrangler.jsonc` | Cloudflare Workers config |

### CSS Variables

Colors and fonts are defined as CSS custom properties in `global.css` using Tailwind v4's `@theme` block. Dark mode is handled via `@media (prefers-color-scheme: dark)` overriding `:root` variables — no JavaScript needed.

```css
@theme { --color-bg: ...; }                    /* → bg-bg, text-bg utilities */
@media (prefers-color-scheme: dark) { :root {} } /* dark overrides */
```

### Conventions

- **Package manager**: Bun
- **Fonts**: Loaded via Google Fonts `@import` in `global.css`; preconnect links in `Layout.astro`
- **lang**: `ja` (Japanese)
