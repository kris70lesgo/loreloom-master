# Loreloom Worker Deployment

Loreloom uses a Supabase-backed queue. The web app creates rows in `generation_jobs`, and the worker claims those rows, generates text/images, mints when enabled, and updates the database.

Vercel should host the frontend and Next API routes. The worker must run as a separate always-on process.

## Recommended: Railway

1. Create a new Railway project from this GitHub repository.
2. Railway will read `railway.json`.
3. Use these commands if Railway asks:

```bash
npm install && npm run build:backend
```

```bash
npm run start:worker -w @loreloom/api
```

4. Add the production environment variables listed below.
5. Deploy and watch logs for:

```text
Loreloom worker production-worker-1 started.
Processing genesis.generate job ...
```

## Alternative: Render

1. Create a new Blueprint from this GitHub repository, or create a Background Worker manually.
2. Render can read `render.yaml`.
3. If creating manually, use:

```bash
npm install && npm run build:backend
```

```bash
npm run start:worker -w @loreloom/api
```

## Required Environment Variables

Use the same production Supabase project as Vercel.

```bash
NODE_ENV=production
WORKER_ID=production-worker-1
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
TAVILY_API_KEY=
POLLINATIONS_API_KEY=
PINATA_JWT=
MINT_MODE=
THIRDWEB_CLIENT_ID=
THIRDWEB_SECRET_KEY=
THIRDWEB_VAULT_ACCESS_TOKEN=
THIRDWEB_TRANSACTIONS_URL=
X_LAYER_CHAIN_ID=
GENESIS_CONTRACT_ADDRESS=
CHAPTER_CONTRACT_ADDRESS=
```

Some minting variables are only required when `MINT_MODE` uses real Thirdweb minting. For generation without minting, Supabase, Groq, Tavily, and Pollinations are the important ones.

## How To Verify

1. Open the worker logs and confirm it starts.
2. Create a Genesis world in the deployed Vercel app.
3. The worker logs should show a `genesis.generate` job, then a `portrait.generate` job.
4. In Supabase, `generation_jobs.status` should move from `queued` to `processing` to `succeeded`.
5. The related `worlds.status` should move toward `portrait_ready`.

If the app stays on `Generating`, check the worker logs first. If no job appears, the API did not enqueue correctly. If a job appears and fails, the logs will usually identify the missing API key or provider error.
