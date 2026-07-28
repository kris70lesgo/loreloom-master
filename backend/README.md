# Loreloom

Persistent AI Art Director agent for the OKX.AI Genesis Hackathon.

This first setup gives the project a Next.js frontend and a Node/Express backend with swappable AI providers:

- OpenRouter
- Gemini
- NVIDIA NIM

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Frontend: `http://localhost:3000`

Backend: `http://localhost:4000`

## Environment

Copy `.env.example` to `.env`, then add whichever provider keys you want to test.

The backend will run even if keys are missing; provider calls return a clear setup error until the matching key is configured.

## Backend Queue

The backend now includes the Supabase/Postgres foundation for Loreloom's durable generation pipeline.

- SQL migration: `supabase/migrations/202607120001_loreloom_backend.sql`
- API entrypoint: `npm run dev:api`
- Worker entrypoint: `npm run dev:worker`
- API + worker + web together: `npm run dev:all`

Apply the migration in your Supabase project, then set:

```bash
SUPABASE_URL=https://khbwebwosasbwsdlayil.supabase.co
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The current Supabase project is `loreloom` in `ap-south-1`, project ref `khbwebwosasbwsdlayil`. Use the Supabase dashboard to copy the server-only `service_role` key into `.env`; do not expose that key to Next.js or commit it.

The worker claims jobs through the `claim_next_generation_job` SQL function using `FOR UPDATE SKIP LOCKED`. Local IPFS and minting default to mock mode so the full flow can be tested before Pinata and thirdweb are enabled.

Main backend routes:

- `POST /api/users`
- `POST /api/worlds`
- `GET /api/worlds/:worldId`
- `POST /api/worlds/:worldId/portrait/regenerate`
- `POST /api/worlds/:worldId/confirm`
- `POST /api/worlds/:worldId/chapters`
- `POST /api/worlds/:worldId/portrait/retry`
- `POST /api/worlds/:worldId/genesis/retry`
- `POST /api/worlds/:worldId/chapters/:chapterId/retry`

## AI pipeline

Loreloom has two prompted roles: the Genesis agent creates the locked character sheet and portrait brief once, while the Story engine writes each chapter and replaces the compact story bible. Both use provider-enforced tool calls plus Zod validation; Gemini is primary, NVIDIA is used only for transient Gemini failures, and OpenRouter can be selected per world for testing.

Unsafe, refused, malformed, or image-less generations are recorded as blocked jobs and never enqueue a mint. Gemini is the primary reference-aware image provider; Hugging Face FLUX.1-schnell is used only when Gemini has a quota or transient provider failure. Real illustration and metadata storage require `IPFS_MODE=pinata` and `PINATA_JWT`; mock storage intentionally cannot mint AI-generated art.
- `GET /api/jobs/:jobId`
