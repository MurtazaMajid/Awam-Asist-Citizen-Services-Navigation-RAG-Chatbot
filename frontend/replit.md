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

## Future integration

The user has a Python Jupyter notebook with a RAG retrieval pipeline. To plug it in:
1. Expose the notebook's retrieval as a Python HTTP service.
2. Replace the system-prompt knowledge base in `artifacts/api-server/src/routes/chat.ts` with a call to that retrieval service, passing the retrieved chunks as additional context to the LLM.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
