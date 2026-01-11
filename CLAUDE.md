# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack AI chatbot application (`0xjj.dev`) deployed on Cloudflare, featuring:
- **Frontend**: React 19 + TypeScript + Vite SPA with streaming AI chat interface
- **Backend**: Cloudflare Workers using Hono.js microframework
- **AI**: Cloudflare Workers AI (Llama 3.1 8B model) with streaming responses
- **Rate Limiting**: Durable Objects for stateful IP-based rate limiting
- **Infrastructure**: Terraform-managed Cloudflare resources

## Development Commands

### Core Development
```bash
bun run dev          # Start development server with HMR
bun run build        # Build TypeScript + Vite bundle
bun run lint         # Check code with Biome linter
bun run format       # Format code with Biome (--write)
bun run preview      # Build and preview locally
bun run deploy       # Build and deploy to Cloudflare
```

### Cloudflare-Specific
```bash
bun run cf-typegen   # Generate Cloudflare Workers types
wrangler dev         # Local Workers development
wrangler tail        # View live logs from deployed worker
wrangler deploy      # Deploy worker only (no frontend build)
```

### UI Components
```bash
bun run ui:add       # Add shadcn/ui components
```

## Architecture

### Monorepo Structure
- `src/` - React frontend (ES2022, React JSX)
- `worker/` - Cloudflare Workers backend (Workers runtime)
- `terraform/` - Infrastructure as Code

### Key Technical Patterns

#### Streaming Chat Flow
1. Frontend uses `@ai-sdk/react` `useChat` hook
2. Sends POST to `/api/chat` with message array
3. Worker checks rate limit via Durable Object
4. Streams response from Workers AI as Server-Sent Events
5. Custom `src/lib/http.ts` converts SSE to AI SDK format
6. UI updates progressively with streaming text

#### Message Architecture
- Messages support branching/versioning via `MessageBranch` components
- Custom `convertedMessages` pipeline transforms AI SDK format to internal `MessageType`
- Rich markdown rendering with syntax highlighting via Streamdown + Shiki

#### Rate Limiting
- IP-based rate limiting: 2 requests per 60 seconds
- Implemented via Durable Objects (`worker/do/ipRateLimiter.ts`)
- Sliding window algorithm with persistent storage
- Returns 429 with `retry-after` headers when exceeded

### Component System
- **Base UI**: shadcn/ui components (24 components) in `src/components/ui/`
- **AI Elements**: Custom chat components (30 components) in `src/components/ai-elements/`
- **Registry**: Uses custom AI elements registry from `registry.ai-sdk.dev`

## Configuration Files

### TypeScript Configuration
- `tsconfig.app.json` - Frontend build config
- `tsconfig.worker.json` - Worker build config
- `tsconfig.node.json` - Build tools config

### Build Tools
- **Vite**: React SWC plugin, Tailwind CSS v4, Cloudflare plugin, path aliases (`@/`)
- **Biome**: Linter/formatter with Tailwind CSS directive support, git integration
- **Wrangler**: AI binding (`AI`), Durable Object binding (`RATE_LIMITER`)

### Tailwind Setup
- Uses Tailwind CSS v4 via `@tailwindcss/vite`
- CSS variables for theming in `src/global.css`
- shadcn/ui "new-york" style with Lucide icons

## Key Dependencies

### Frontend Stack
- **React 19.1.1** - Latest with streaming-optimized hooks
- **AI SDK 6.0.27** - `@ai-sdk/react` for chat UI, core stream utilities
- **Tailwind CSS 4.1.18** - Utility-first styling
- **shadcn/ui** - Accessible component system on Radix UI
- **react-hook-form + zod** - Form validation (1-10,000 char messages)
- **Streamdown** - Markdown to React component parsing
- **Shiki** - Code syntax highlighting

### Backend Stack
- **Hono 4.11.3** - Lightweight web framework (1.8KB)
- **workers-ai-provider** - Cloudflare Workers AI adapter for AI SDK
- **Cloudflare Workers** - Edge compute runtime

### Development
- **Vite 7.1.2** - Fast build tool with HMR
- **Biome 2.3.11** - Fast linter/formatter
- **TypeScript 5.8.3** - Type safety
- **Wrangler 4.58.0** - Cloudflare CLI

## Environment Setup

### Cloudflare Bindings (wrangler.jsonc)
```json
{
  "ai": { "binding": "AI" },
  "durable_objects": {
    "bindings": [{ "name": "RATE_LIMITER", "class_name": "IpRateLimiter" }]
  }
}
```

### Required Environment
- Cloudflare account with Workers AI enabled
- Durable Objects enabled for rate limiting
- Terraform for infrastructure management

## File Structure Patterns

### Frontend Organization
- Components follow compound component pattern
- Each component exports main component + sub-components
- Form handling combines react-hook-form + AI SDK patterns

### Worker Organization
- `worker/index.ts` - Hono app setup, middleware, routing
- `worker/usecase/` - Business logic (chat, rate limiting)
- `worker/do/` - Durable Object implementations
- `worker/util/` - Shared utilities

### Styling Approach
- CSS variables for theme support
- Utility-first with Tailwind
- Component-specific styles via class-variance-authority

## Testing and Quality

### Code Quality
- Biome enforces consistent formatting and linting
- TypeScript strict mode enabled
- Git hooks integration via Biome VCS support

### Development Workflow
1. `bun run dev` for local development with HMR
2. `bun run lint` before commits
3. `bun run deploy` for Cloudflare deployment

## Deployment

### Single Command Deploy
```bash
bun run deploy
```
This command:
1. Runs TypeScript compilation (`tsc -b`)
2. Builds frontend bundle (`vite build`)
3. Deploys both frontend and worker (`wrangler deploy`)

### Infrastructure Management
- Terraform configuration in `terraform/`
- Uses Cloudflare provider with R2 backend for state
- Manages Cloudflare resources programmatically

## Important Notes

- **Stream Format**: Uses custom SSE-to-AI SDK conversion in `lib/http.ts`
- **Rate Limits**: Currently hardcoded to 2/60s, could be made configurable
- **Message Branching**: Infrastructure exists but not fully utilized in UI
- **IP Extraction**: Handles both CF-Connecting-IP and X-Forwarded-For headers
- **Security**: CSRF protection, secure headers, CORS via Hono middleware
- **AI Model**: Uses `@cf/meta/llama-3.1-8b-instruct-fp8` on Cloudflare Workers AI