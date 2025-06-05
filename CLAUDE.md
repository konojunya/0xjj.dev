# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun dev` - Start development server with Turbopack
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run Biome linting
- `bun run format` - Run Biome formatting with auto-fix
- `bun ui:add` - Add shadcn/ui components

## Architecture Overview

This is a Next.js 15 personal portfolio site (0xjj.dev) for Junya Kono with the following key features:

### AI Chat System
- `/app/api/chat/route.ts` - OpenAI-powered chat API with rate limiting (20 questions/day)
- `components/shared/Header/AI.tsx` - Chat interface in a bottom drawer
- Uses `/public/llms.txt` for AI context about JJ
- Cookie-based question counting with 24h expiration

### Component Structure
- `components/shared/` - Reusable components (Layout, Header, ThemeProvider)
- `components/shared/bits/` - Visual effects (SplashCursor, Orb, DecryptedText, etc.)
- `components/ui/` - shadcn/ui components
- `components/pages/` - Page-specific components

### Core Stack
- Next.js 15 with App Router and standalone output
- TypeScript with strict configuration
- Tailwind CSS with custom animations
- Biome for linting/formatting (excludes `components/shared/bits` and `components/ui`)
- Bun as package manager
- Vercel Analytics and Speed Insights

### Styling & Effects
- `next-themes` for dark/light mode with system preference
- GSAP and Motion for animations
- Three.js/OGL for 3D effects
- Custom visual components in `/bits` directory

### Path Aliases
- `@/*` maps to root directory for clean imports

## Important Notes

- Uses Japanese locale (`lang="ja"`) in root layout
- Standalone Next.js build for deployment
- Remote images allowed from `images.microcms-assets.io`
- AI chat has strict validation (100 char limit, rate limiting)