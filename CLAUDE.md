# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo:

```
/
├── sites/
│   └── 0xjj.dev/        ← Astro site (main)
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
- **Wrangler** for Cloudflare Workers deployment (static assets)
- **Astro View Transitions** (`ClientRouter`) — SPA-like navigation

### Key Files

| Path | Purpose |
|---|---|
| `sites/0xjj.dev/src/layouts/Layout.astro` | Root HTML shell — `global.css`, OG meta, `lang="ja"`, `ClientRouter` |
| `sites/0xjj.dev/src/styles/global.css` | Tailwind import + CSS variables (colors, fonts) |
| `sites/0xjj.dev/src/pages/index.astro` | Top page (Hero + Skills + Timeline) |
| `sites/0xjj.dev/src/pages/blog/index.astro` | Blog list with client-side search |
| `sites/0xjj.dev/src/pages/blog/[slug].astro` | Blog post page |
| `sites/0xjj.dev/src/pages/og/[slug].png.ts` | Dynamic OGP image generation (satori + resvg-wasm) |
| `sites/0xjj.dev/src/pages/rss.xml.ts` | RSS feed |
| `sites/0xjj.dev/src/content/config.ts` | Astro content collections schema |
| `sites/0xjj.dev/astro.config.mjs` | Astro config — integrations, markdown plugins, Vite setup |
| `sites/0xjj.dev/wrangler.jsonc` | Cloudflare Workers config (observability enabled) |

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
