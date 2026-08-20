# Loreloom — Handover Context for AI Agents

> **Read this file first.** It contains the full project state, what's been done, what's pending, and how everything fits together.

---

## 1. Project Overview

**Loreloom** is being pivoted from a generic AI storytelling platform into an **AI-Powered Living Archive of Karnataka** for the AKKA Silver Jubilee World Kannada Conference 2026 hackathon.

**Mission:** Transform Karnataka's heritage (monuments, folklore, festivals, artisan crafts, dynasties) into immersive AI-powered experiences while preserving cultural knowledge for future generations with on-chain provenance.

**Target hackathon:** https://akkaonline.org/2026/hakkathon/

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript + Framer Motion + Tailwind |
| Backend | Express.js + TypeScript (Node.js) |
| Worker | Separate Node.js process polling Supabase for background jobs |
| Database | Supabase (PostgreSQL) — project ID: `khbwebwosasbwsdlayil` |
| AI Text | Groq API (`openai/gpt-oss-120b`) — NOT Gemini |
| AI Images | Pollinations AI (primary), Stability AI (fallback, no credits), Gemini (last resort) |
| Web Research | Tavily API — Heritage Research Agent |
| IPFS | Pinata (JWT-based pinning) |
| Blockchain | X Layer testnet (chain ID 1952) via ethers.js direct mint |
| Contracts | Solidity ERC-721 (LoreloomGenesis + LoreloomChapter) with AccessControl |

---

## 3. How to Run

```bash
# Install everything
npm run install:all

# Run all three processes (frontend + backend + worker)
npm run dev

# Or individually:
npm run dev:frontend    # Next.js on port 3000
npm run dev:backend     # Express API on port 4000
npm run dev:worker      # Background job worker

# Tests
npm test -w @loreloom/api           # 26 backend tests
cd frontend && npx vitest run       # Frontend tests (7 pre-existing SimpleMarkdown failures)

# TypeScript check
npx tsc --noEmit -p backend/apps/api/tsconfig.json
cd frontend && npx tsc --noEmit
```

**All three processes must be running** for the app to work: frontend (UI), backend (API), worker (background generation jobs).

---

## 4. Environment Variables

All keys are in the root `.env` file. **Never commit secrets.**

### Set and Working ✅

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (admin access) |
| `GROQ_API_KEY` | Text generation (primary AI provider) |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |
| `TAVILY_API_KEY` | Heritage Research Agent web search |
| `STABILITY_API_KEY` | Image generation fallback (no credits — don't rely on) |
| `POLLINATIONS_API_KEY` | Image generation (primary) |
| `THIRDWEB_CLIENT_ID` | Thirdweb API client ID |
| `THIRDWEB_SECRET_KEY` | Thirdweb API secret (verified working) |
| `PINATA_JWT` | IPFS pinning — current local value is invalid/malformed and must be replaced before real mints can complete |
| `MINT_MODE` | `direct` — uses ethers.js to call contracts directly |
| `GENESIS_CONTRACT_ADDRESS` | `0xE4C2e906eabfC825193A7b8410274529889dc294` (X Layer testnet) |
| `CHAPTER_CONTRACT_ADDRESS` | `0x6A9c67B95C5669d63BaFa641d9B5aae4160Fce44` (X Layer testnet) |
| `X_LAYER_CHAIN_ID` | `1952` |
| `X_LAYER_RPC_URL` | `https://xlayertestrpc.okx.com` |
| `MINT_DEPLOYER_ADDRESS` | `0xF440F6363a3A99bFa2Ae8b856b965D716a1694a9` (has MINTER_ROLE) |
| `MINT_DEPLOYER_PRIVATE_KEY` | Private key for deployer wallet (66 chars, verified matching) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL for frontend |

### Missing ⚠️

| Variable | Impact |
|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend Supabase auth may not work unless paired with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_ANON_KEY` fallback |
| `IPFS_MODE` | Not set — defaults to `pinata` in config |
| `NEXT_PUBLIC_WALLET_ADDRESS` | Not used for ownership fallback anymore; unauthenticated sessions use a per-browser guest owner id |

### Unused / Vestigial

| Variable | Note |
|---|---|
| `USE_LIVE_NETWORK` | Hedera — NOT used by any code |
| `HEDERA_TESTNET_ACCOUNT_ID` | Hedera — NOT used by any code |
| `HEDERA_TESTNET_PRIVATE_KEY` | Hedera — NOT used by any code |

---

## 5. Architecture — Backend

### Directory: `backend/apps/api/src/`

#### AI Layer (`ai/`)
- `providers.ts` — AI provider abstraction. Supports Gemini, OpenRouter, NVIDIA, Groq. **Groq is the default.**
- `openaiCompatible.ts` — OpenAI-compatible chat/tool-call interface
- `types.ts` — TypeScript types for generation I/O
- `errors.ts` — `AiBlockedError`, `ProviderRequestError`, `MintPendingError`
- `research.ts` — Zod schemas for research evidence, claim types, source types

#### Services (`services/`)
- `story.ts` — **Core generation pipeline.** `generateGenesisDraft()` and `generateChapterDraft()`. Uses Groq structured generation (tool calls + Zod validation with retry). Integrates Heritage Research Agent before generation.
- `heritageResearch.ts` — Heritage Research Agent. Decides if Tavily search is needed, generates targeted queries, retrieves evidence, classifies claims (VERIFIED_HISTORY, FOLKLORE, LEGEND, etc.), caches in Supabase.
- `tavily.ts` — TavilyResearchProvider (implements ResearchProvider interface). Handles auth, search, normalization, timeouts, rate limits.
- `images.ts` — Image generation. **Pollinations AI is primary** (free, fast). Stability AI is fallback (no credits). Gemini is last resort. Generates portraits and chapter illustrations with Karnataka heritage grounding.
- `knowledge.ts` — `fetchVisualKnowledge()` — fetches cached visual knowledge for image prompts.
- `ipfs.ts` — Pinata IPFS pinning for metadata and images.
- `mint.ts` — Mint orchestration. Routes to `directMint` (MINT_MODE=direct), `thirdwebEngine` (MINT_MODE=thirdweb-*), or mock. Genesis and Chapter minting with idempotency.
- `directMint.ts` — **New.** Direct on-chain minting via ethers.js. Calls `mint()` on Genesis contract and `mintChapter()` on Chapter contract. Handles transaction submission, receipt waiting, token ID parsing from events, DB upsert.
- `thirdwebEngine.ts` — Thirdweb Transactions/Engine API client (v3 and v2). Not currently used (MINT_MODE=direct).
- `worlds.ts` — World CRUD, chapter creation, world confirmation (triggers genesis mint), canon retrieval.
- `users.ts` — User upsert, wallet address normalization (EVM format).
- `jobs.ts` — Background job queue (claim, succeed, fail, block, enqueue).

#### Worker (`worker.ts` + `workers/handlers.ts`)
The worker polls `generation_jobs` table and processes jobs in order:
```
genesis.generate → portrait.generate → genesis.mint
chapter.generate → chapter.image → chapter.mint
```

**Job pipeline:**
1. `genesis.generate` — Groq generates character sheet + world facts via `generateGenesisDraft()`
2. `portrait.generate` — Pollinations generates reference portrait image
3. `genesis.mint` — Pins metadata to IPFS, mints Genesis NFT on X Layer testnet
4. `chapter.generate` — Groq generates chapter text + scene description
5. `chapter.image` — Pollinations generates chapter illustration
6. `chapter.mint` — Pins metadata to IPFS, mints Chapter NFT (requires confirmed Genesis token)

#### Routes (`routes/`)
- `worlds.ts` — World CRUD, chapter creation, confirm world (triggers mint), regenerate
- `ai.ts` — AI generation endpoints
- `jobs.ts` — Job status endpoints
- `heritage.ts` — Heritage research endpoints
- `users.ts` — User endpoints

#### Config (`config.ts`)
All environment variables loaded here. Key sections: `groq`, `tavily`, `stability`, `pollinations`, `ipfs`, `mint`.

#### Database (`db/`)
- `supabase.ts` — Supabase admin client
- `types.ts` — Row types for all tables

### Database Schema (Supabase migrations)

Tables in `backend/supabase/migrations/`:
- `users` — id, wallet_address, created_at
- `worlds` — id, creator_id, title, intake (JSONB), character_sheet (JSONB), style_lock, status, reference_image_url, genesis_token_id, world_facts, open_threads
- `chapters` — id, world_id, chapter_index, content, scene_description, image_url, chapter_token_id, status
- `generation_jobs` — id, job_type, world_id, chapter_id, status, payload, checkpoint, error_message, worker_id
- `mint_transactions` — idempotency_key, tx_hash, token_id, contract_address, tx_type, world_id, chapter_id, status, error_message
- `heritage_research_cache` — subject, research_evidence (JSONB), created_at, updated_at

---

## 6. Architecture — Frontend

### Directory: `frontend/src/`

#### Pages (`app/`)
- `page.tsx` — Landing page (Hero component with video background)
- `login/page.tsx` — Login/signup page (email/password + Google OAuth). Redirects to `/dashboard` after auth.
- `login/actions.ts` — Server actions for login/signup. Both redirect to `/dashboard`.
- `auth/callback/route.ts` — OAuth callback handler. Redirects to `/dashboard`.
- `dashboard/page.tsx` — Dashboard with project list, sidebar, templates
- `genesis/page.tsx` — **Heritage experience creation flow** (5 steps: category → aesthetic → prompt → processing → review/confirm)
- `workspace/page.tsx` — Story workspace (chapter generation, image generation, narrative editing, minting)
- `workspace/gallery/page.tsx` — Gallery of generated content
- `workspace/provenance/page.tsx` — On-chain provenance viewer
- `workspace/shareable/page.tsx` — Shareable story view
- `dashboard/settings/` — Settings pages

#### Components (`components/`)
- `Hero.tsx` — Landing page hero with video, nav, CTA buttons (all route to `/login`)
- `Navbar.tsx` — Top navigation bar
- `ClientLayoutWrapper.tsx` — Wraps pages with Navbar/footer (hides on workspace/dashboard/auth/landing)
- `StoryContext.tsx` — Global state provider (worlds, active world, chapter CRUD)
- `ThemeProvider.tsx` — next-themes wrapper
- Various UI components (VisualSynthesisOverlay, NarrativeBeatCard, etc.)

#### Key State (`context/StoryContext.tsx`)
- Manages worlds list, active world, chapter operations
- Falls back to `WALLET_ADDRESS = "0xa33Ebc28fF3b0135ba2DaC18990DDDc162Dc2467"` if no user ID
- Communicates with backend API at `NEXT_PUBLIC_API_URL`

#### Genesis Page Flow (`app/genesis/page.tsx`)
**Recently updated for Karnataka heritage pivot:**
- Step 1: **Heritage Category** — Heritage Site, Folklore & Legend, Festival & Tradition, Artisan & Craft
- Step 2: **Visual Aesthetic** — Hoysala Architecture, Vijayanagara Empire, Mysore Royal Heritage, Western Ghats & Nature, Custom
- Step 3: **Heritage Prompt** — Text input for heritage subject description
- Step 4: Processing (polls backend for generation status)
- Step 5: Review generated character sheet, narrative, and visual style → "Confirm & Preserve" (triggers on-chain mint)

#### Supabase Client (`lib/supabase/`)
- `client.ts` — Browser-side Supabase client
- `server.ts` — Server-side Supabase client
- `middleware.ts` — Auth middleware

---

## 7. On-Chain Minting — Verified Working

### Contracts (X Layer testnet, chain ID 1952)
- **Genesis**: `0xE4C2e906eabfC825193A7b8410274529889dc294` (ERC-721, `mint(address,string)`)
- **Chapter**: `0x6A9c67B95C5669d63BaFa641d9B5aae4160Fce44` (ERC-721, `mintChapter(address,uint256,string)`)
- **Deployer**: `0xF440F6363a3A99bFa2Ae8b856b965D716a1694a9` (has MINTER_ROLE on both)
- **Balance**: ~0.4 OKX (enough for many mints)

### Mint Flow (MINT_MODE=direct)
1. `mint.ts` routes to `directMint.ts` when `MINT_MODE=direct`
2. `directMint.ts` creates ethers.js Wallet + Contract instances
3. Calls `mint(recipient, metadataUri)` or `mintChapter(recipient, genesisTokenId, metadataUri)`
4. Waits for transaction receipt
5. Parses token ID from event logs
6. Upserts to `mint_transactions` table with idempotency key

### Contract Source
- `backend/contracts/src/LoreloomGenesis.sol` — ERC-721 with AccessControl, MINTER_ROLE
- `backend/contracts/src/LoreloomChapter.sol` — ERC-721 linked to Genesis, requires recipient to be Genesis owner
- Deployment record: `backend/contracts/deployments/xlayer-testnet.json`

---

## 8. Heritage Research Agent (Tavily)

### Flow
```
Heritage Subject → shouldResearch()? → Tavily Search → Normalize Results → Classify Claims → Cache in Supabase → Return to Story Composer
```

### Claim Types
`VERIFIED_HISTORY`, `ARCHAEOLOGICAL_RECORD`, `CULTURAL_TRADITION`, `FOLKLORE`, `LEGEND`, `MYTHOLOGY`, `COMMUNITY_ACCOUNT`, `CURRENT_INFORMATION`, `CREATIVE_INTERPRETATION`

### Source Priority
1. UNESCO, ASI, Government of Karnataka, Karnataka Tourism (highest)
2. Wikipedia, Britannica, established newspapers (medium)
3. Travel blogs, forums (lowest)

### When Tavily is Used
- Local knowledge insufficient (< 500 chars)
- Time-sensitive queries (festivals, current events)
- User explicitly requests deeper research
- NOT for every generation — cached results are reused

---

## 9. What's Done ✅

1. **Groq integration** — text generation, structured output (tool calls + Zod), `tool_use_failed` error handling with `failed_generation` parsing
2. **Tavily Heritage Research Agent** — schemas, ranking, classifications, source attribution, Supabase cache, endpoints
3. **Pollinations image generation** — primary provider, checkpoint provider changed from `stability` to `pollinations`
4. **Supabase connected** — all tables, admin client, auth
5. **Login/signup** — email/password + Google OAuth, redirects to `/dashboard`
6. **Landing page buttons** — all route to `/login`
7. **Logout** — hard redirect after `signOut()`
8. **Genesis page heritage pivot** — categories, aesthetics, prompts, defaults all changed to Karnataka heritage
9. **MetaMask error suppression** — global error handler in layout.tsx
10. **On-chain minting** — `MINT_MODE=direct`, ethers.js, contracts verified live, deployer has MINTER_ROLE, balance confirmed
11. **Page metadata** — updated to "AI-Powered Living Archive of Karnataka"
12. **TypeScript** — both frontend and backend compile cleanly (0 errors)
13. **Backend tests** — 26/26 pass

---

## 10. What's Pending / Known Issues ⚠️

### Critical
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY` missing from .env** — frontend Supabase client may not initialize properly. The key exists as `SUPABASE_ANON_KEY` but needs to also be `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Next.js client-side access.
- **User wallet address** — The mint function requires a recipient wallet address. Currently falls back to `0xa33Ebc28fF3b0135ba2DaC18990DDDc162Dc2467` for users without a connected wallet. No wallet connection UI exists (MetaMask error was from the extension itself, not our code). Consider adding wallet connection or using the user's Supabase ID-derived address.
- **Stability AI has no credits** — don't rely on it as image provider. Pollinations is primary.

### Frontend Tests
- 7 pre-existing `SimpleMarkdown.test.tsx` tests fail — these are unrelated to the heritage pivot, existed before changes.

### Not Yet Implemented (from the pivot plan)
- Module 4: Oral History Preservation (upload family stories, recordings, Kannada documents)
- Module 6: Timeline (visual historical timeline of Karnataka dynasties)
- Module 7: Interactive Tourism (travel guide mode)
- Module 8: Festival Experience (dedicated festival exploration)
- Module 9: Folk Arts (Yakshagana, Dollu Kunitha interactive experiences)
- Module 10: Artisan Stories (marketplace integration)
- Fact Separation Agent UI (backend classification exists, frontend display does not)
- Source citations display in frontend (backend preserves sources, frontend doesn't show them yet)
- Kannada language output (translation agent not implemented)
- Contribution flow for user-uploaded cultural content

### Vestigial / Unused
- Hedera credentials in `.env` — not referenced by any code
- `thirdwebEngine.ts` — not used with MINT_MODE=direct (kept for future use)
- `/explore` page and heritage catalog UI — removed at user's request
- `backend/apps/web` workspace — listed in package.json workspaces but may be empty

---

## 11. Key Files to Know

| File | Purpose |
|---|---|
| `backend/apps/api/src/config.ts` | All env var loading |
| `backend/apps/api/src/services/story.ts` | Core AI generation pipeline |
| `backend/apps/api/src/services/heritageResearch.ts` | Tavily research agent |
| `backend/apps/api/src/services/tavily.ts` | Tavily API client |
| `backend/apps/api/src/services/images.ts` | Image generation (Pollinations primary) |
| `backend/apps/api/src/services/mint.ts` | Mint orchestration |
| `backend/apps/api/src/services/directMint.ts` | Direct ethers.js on-chain minting |
| `backend/apps/api/src/services/thirdwebEngine.ts` | Thirdweb API client (unused with direct mode) |
| `backend/apps/api/src/workers/handlers.ts` | Background job pipeline |
| `backend/apps/api/src/ai/providers.ts` | AI provider abstraction |
| `backend/contracts/src/LoreloomGenesis.sol` | Genesis NFT contract |
| `backend/contracts/src/LoreloomChapter.sol` | Chapter NFT contract |
| `backend/contracts/deployments/xlayer-testnet.json` | Deployment record |
| `frontend/src/app/genesis/page.tsx` | Heritage experience creation flow |
| `frontend/src/app/workspace/page.tsx` | Story workspace |
| `frontend/src/app/login/page.tsx` | Login/signup |
| `frontend/src/context/StoryContext.tsx` | Global state |
| `frontend/src/components/Hero.tsx` | Landing page |
| `frontend/src/app/layout.tsx` | Root layout (MetaMask error suppression) |

---

## 12. Security Notes

- **Rotate exposed keys**: Several API keys and private keys were shared in chat during development. After the hackathon, rotate: Supabase service role key, thirdweb secret key, Pinata JWT, Hedera private key, Groq/Tavily/Stability/Pollinations keys, and the X Layer deployer private key.
- **TAVILY_API_KEY is backend-only** — never expose to frontend.
- **MINT_DEPLOYER_PRIVATE_KEY is backend-only** — never expose to frontend.
- **Treat web content as untrusted** — Tavily results are sanitized before passing to AI prompts.
- **No API keys in frontend bundles** — all sensitive keys are in root `.env` and only accessed by backend code.

---

## 13. Demo Flow for Judges (3-4 minutes)

1. Choose a heritage subject (e.g., **Hampi**)
2. AI generates an interactive historical journey with visuals
3. Switch to **Yakshagana** and show AI-generated explanation, story, and artwork
4. Show on-chain mint confirmation (X Layer testnet transaction)
5. End by showing provenance and source attribution

---

## 14. Quick Reference Commands

```bash
# Start everything
npm run dev

# TypeScript check (both)
npx tsc --noEmit -p backend/apps/api/tsconfig.json
cd frontend && npx tsc --noEmit

# Backend tests
npm test -w @loreloom/api

# Frontend tests
cd frontend && npx vitest run

# Compile contracts (if needed)
cd backend/contracts && npm run compile

# Deploy contracts (already done — don't re-deploy)
# cd backend/contracts && npm run deploy:testnet:direct
```
