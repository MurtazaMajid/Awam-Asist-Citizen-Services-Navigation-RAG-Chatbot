# Awam Assist

## Overview

Awam Assist is a citizen services chatbot for Pakistan, helping users navigate Zakat & welfare, IESCO electricity, transport, marriage & birth certificates, and emergency helplines. The conversational backend is powered by an LLM grounded with a verified knowledge base of Pakistani government services.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind (artifact: `artifacts/awam-assist`)
- **API framework**: Express 5 (artifact: `artifacts/api-server`)
- **AI**: OpenAI via Replit AI Integrations (`@workspace/integrations-openai-ai-server`)
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)

## Key endpoints

- `POST /api/chat` — accepts `{ messages: ChatMessage[], category?: ChatCategory }`, returns `{ reply, suggestions }`. Backed by `gpt-5.4` with a verified Pakistani citizen-services knowledge base baked into the system prompt.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## RAG pipeline integration

The chat backend supports an optional external RAG service. Set `RAG_API_URL` (and optionally `RAG_API_KEY`) and the chat route will POST `{ query, category, top_k }` to it before each Groq completion, then prepend the retrieved chunks to the system prompt. See `artifacts/api-server/src/lib/rag.ts` for the contract and `DEPLOY.md` for setup.

When `RAG_API_URL` is not set, the chatbot falls back to the static knowledge base baked into `artifacts/api-server/src/routes/chat.ts`.

## Deployment

- **Vercel** for the frontend (`artifacts/awam-assist`) — config in `artifacts/awam-assist/vercel.json`. Set `VITE_API_BASE_URL` to the backend URL.
- **Render** for the Express backend (`artifacts/api-server`) — config in `render.yaml`. Set `GROQ_API_KEY`, `SESSION_SECRET`, and optional `RAG_API_URL` / `RAG_API_KEY`.

Full step-by-step instructions are in `DEPLOY.md`.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
