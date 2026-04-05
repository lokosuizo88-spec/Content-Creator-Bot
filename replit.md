# Workspace

## Overview

Social AI Content Creator — a full-stack web app for creating AI-generated Instagram and TikTok content. Users add a topic, context, tone, and target audience, then generate captions, hashtags, and scroll-stopping hooks with one click using OpenAI.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Artifacts

- **social-ai** (`artifacts/social-ai/`): React + Vite frontend at `/`
- **api-server** (`artifacts/api-server/`): Express API at `/api`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## API Routes

- `GET /api/posts` — list posts (filterable by platform, status)
- `POST /api/posts` — create a post
- `GET /api/posts/:id` — get a post
- `PUT /api/posts/:id` — update a post
- `DELETE /api/posts/:id` — delete a post
- `POST /api/posts/:id/generate` — generate AI content (caption, hashtags, hooks)
- `POST /api/posts/:id/publish` — mark post as published
- `GET /api/stats/summary` — get stats counts
- `GET /api/stats/recent` — get 10 most recent posts

## Database Schema

- `posts` table: `id`, `topic`, `context`, `platform`, `status`, `generated_caption`, `generated_hashtags`, `generated_hooks`, `tone`, `target_audience`, `created_at`, `updated_at`

## AI Integration

Uses Replit AI Integrations for OpenAI access (no user API key needed). Env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
