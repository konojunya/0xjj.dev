# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo:

```
/
├── sites/
│   ├── 0xjj.dev/        ← Astro site (main)
│   └── playground.0xjj.dev/ ← Next.js playground (tools, games & experiments)
├── workers/
│   └── games/           ← Unified game server with multiple DOs (games-api.0xjj.dev)
└── scripts/
    └── generate-ogp/    ← Go script for OGP background image generation
```

## Development Commands

Run from `sites/0xjj.dev/`:

- `bun dev` - Start Astro dev server
- `bun run build` - Build for production
- `bun run preview` - Preview production build locally
- `wrangler deploy` - Deploy to Cloudflare Workers

Run from `scripts/generate-ogp/`:

- `make gen` - Generate OGP background PNGs (outputs to `sites/0xjj.dev/public/og/bg/`)

## Architecture Overview

Personal portfolio/blog site for JJ (Junya Kono) — v4 is built with **Astro 5** + **Tailwind CSS v4** + **React 19**, deployed via **Cloudflare Workers** (static assets mode) with Wrangler.

### Stack

- **Astro 5** with Vite — static site generation
- **React 19** via `@astrojs/react` — used for interactive components (e.g. `Signature.tsx`)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (no `tailwind.config.*` file needed)
- **Wrangler** for Cloudflare Workers deployment (static assets + Worker hybrid)
- **Cloudflare KV** (`BLOG_VIEWS`) — blog post view count storage
- **Astro View Transitions** (`ClientRouter`) — SPA-like navigation

### Key Files

| Path | Purpose |
|---|---|
| `sites/0xjj.dev/src/layouts/Layout.astro` | Root HTML shell — `global.css`, OG meta, `lang="ja"`, `ClientRouter` |
| `sites/0xjj.dev/src/styles/global.css` | Tailwind import + CSS variables (colors, fonts) |
| `sites/0xjj.dev/src/pages/index.astro` | Top page (Hero + Skills + Timeline) |
| `sites/0xjj.dev/src/pages/blog/index.astro` | Blog list with client-side search + Popular Posts Top 3 |
| `sites/0xjj.dev/src/pages/blog/[slug].astro` | Blog post page with view tracking |
| `sites/0xjj.dev/worker/index.ts` | Worker API — blog view count endpoints (KV) |
| `sites/0xjj.dev/src/pages/og/[slug].png.ts` | Dynamic OGP image generation (satori + resvg-wasm) |
| `sites/0xjj.dev/src/pages/rss.xml.ts` | RSS feed |
| `sites/0xjj.dev/src/content/config.ts` | Astro content collections schema |
| `sites/0xjj.dev/astro.config.mjs` | Astro config — integrations, markdown plugins, Vite setup |
| `sites/0xjj.dev/wrangler.jsonc` | Cloudflare Workers config (static assets + Worker hybrid, KV binding) |

### Content Collections

Defined in `src/content/config.ts` using Astro's Content Layer API:

| Collection | Source | Schema |
|---|---|---|
| `blog` | `src/content/blog/*.md` | `title`, `date` |
| `work` | `src/content/work.yaml` | `date`, `title`, `role`, `url?`, `current?` |
| `project` | `src/content/project.yaml` | `date`, `title`, `url`, `type?`, `render?` |
| `skill` | `src/content/skills.yaml` | `id`, `rate` (1–5), `category?` |

### OGP Image Generation

Blog posts get dynamic OGP images at `/og/[slug].png`:

- **Runtime**: `satori` renders an HTML-like tree to SVG; `@resvg/resvg-wasm` converts SVG → PNG
- **Background**: Pre-generated pastel PNGs at `public/og/bg/[slug].png` — regenerate via `make gen` in `scripts/generate-ogp/`
- **Fonts for OGP**: Inter + Noto Sans JP loaded from `@fontsource` packages (not Google Fonts)

### Blog View Tracking

Blog post views are tracked via a Cloudflare Worker API backed by KV (`BLOG_VIEWS` namespace):

- **Architecture**: Static assets + Worker hybrid — `run_worker_first: ["/api/*"]` routes only `/api/*` to the Worker; all other requests serve static Astro files directly
- **Worker**: `worker/index.ts` — 3 endpoints:
  - `POST /api/views/:slug` — increment view count (fire-and-forget via `ctx.waitUntil`)
  - `GET /api/views/top` — return Top 3 posts from `_top` KV key
  - `GET /api/views/:slug` — return single post view count
- **KV structure**: per-slug keys (`"gemini-api-poker"` → `"42"`) + `_top` index key (JSON array of top 3 sorted by views)
- **Blog post page**: `astro:page-load` event fires POST (tracking) + GET (display view count) — progressive enhancement
- **Blog index**: fetches `/api/views/top` and dynamically renders Popular Posts section — hidden if API fails

### CSS Variables

Colors and fonts are defined as CSS custom properties in `global.css` using Tailwind v4's `@theme` block. Dark mode is handled via `@media (prefers-color-scheme: dark)` overriding `:root` variables — no JavaScript needed.

```css
@theme { --color-bg: ...; --color-fg: ...; --color-muted: ...; --color-accent: ...; }
@media (prefers-color-scheme: dark) { :root {} } /* dark overrides */
```

Custom colors (`bg`, `fg`, `muted`, `accent`) generate Tailwind utilities like `bg-bg`, `text-fg`, etc.

### Markdown Plugins

- `remark-directive` — `::`/`:::` directive syntax
- `remarkZennMessage` — custom Zenn-style message/alert blocks
- `remarkCodeMeta` — parses code block meta attributes
- `rehype-shift-heading` (`shift: 1`) — shifts heading levels down by 1
- `rehypeExternalLinks` — adds `target="_blank"` / `rel` to external links
- Shiki transformer `code-filename` — renders `filename="..."` meta as a label on code blocks

### Conventions

- **Package manager**: Bun
- **Fonts (site)**: DM Serif Display + JetBrains Mono via Google Fonts `@import`; preconnect links in `Layout.astro`
- **Fonts (OGP)**: Inter + Noto Sans JP via `@fontsource` npm packages
- **lang**: `ja` (Japanese)
