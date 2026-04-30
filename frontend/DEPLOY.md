# Deploying Awam Assist

Frontend → Vercel. Backend → Render. Optional RAG service → wherever you host your FastAPI.

---

## 1. Deploy the backend on Render

The Express API lives in `artifacts/api-server`. A `render.yaml` at the repo root configures it as a Render Web Service.

### Steps

1. Push this repo to GitHub.
2. Go to https://dashboard.render.com → **New +** → **Blueprint**.
3. Connect your GitHub repo. Render will detect `render.yaml` and create a service called `awam-assist-api`.
4. Click **Apply**. When prompted for environment variables, set:
   - `GROQ_API_KEY` — from https://console.groq.com/keys
   - `SESSION_SECRET` — any random string (e.g. `openssl rand -hex 32`)
   - `RAG_API_URL` — *optional*, your FastAPI retrieval endpoint
   - `RAG_API_KEY` — *optional*, bearer token for your FastAPI
5. Wait for the first deploy to finish. Render gives you a URL like `https://awam-assist-api.onrender.com`.
6. Verify it works: open `https://awam-assist-api.onrender.com/api/healthz` — you should see `{"status":"ok"}`.

### Render free-tier note
Free Render services sleep after 15 minutes of inactivity and take ~30 seconds to wake up on the first request. For a smoother experience use the $7/mo Starter plan, or hit `/api/healthz` from a cron service like cron-job.org every 10 minutes.

---

## 2. Deploy the frontend on Vercel

The React app lives in `artifacts/awam-assist`. A `vercel.json` configures the monorepo build.

### Steps

1. Same GitHub repo as above.
2. Go to https://vercel.com/new → **Import Project**.
3. Pick the repo. **Important:**
   - **Root Directory:** `artifacts/awam-assist`
   - **Framework Preset:** *Other* (Vercel will use `vercel.json`)
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://awam-assist-api.onrender.com` (the Render URL from step 1, no trailing slash)
5. Click **Deploy**. Vercel gives you a URL like `https://awam-assist.vercel.app`.

### How the frontend finds the backend
`artifacts/awam-assist/src/main.tsx` reads `VITE_API_BASE_URL` and calls `setBaseUrl()` on the API client. Every relative `/api/...` request is then prefixed with that URL, so the frontend talks directly to Render.

---

## 3. (Optional) Connect your FastAPI RAG service

Once your FastAPI endpoint is live (anywhere — Render, Railway, Hugging Face Spaces, your own server):

1. Go to your Render service → **Environment** tab.
2. Set `RAG_API_URL` to your FastAPI URL (e.g. `https://your-rag.onrender.com/retrieve`).
3. Render auto-redeploys. The chat backend now calls your RAG pipeline before each Groq completion.

The contract your `/retrieve` endpoint must follow is documented in `artifacts/api-server/src/lib/rag.ts`.

---

## Troubleshooting

**CORS errors in the browser console** — the backend already enables open CORS (`app.use(cors())` in `artifacts/api-server/src/app.ts`). If you want to lock it down, change to `app.use(cors({ origin: "https://awam-assist.vercel.app" }))`.

**404s from the frontend** — make sure `VITE_API_BASE_URL` is set on Vercel and re-deploy. Without it, requests go to `https://awam-assist.vercel.app/api/...` which doesn't exist.

**Render build fails on `pnpm install`** — the build command in `render.yaml` activates pnpm via corepack. If your Render plan doesn't support corepack, change the build command to:
```
npm install -g pnpm@10.26.1 && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build
```

**Slow first response** — Render free tier sleeps. See note above.
