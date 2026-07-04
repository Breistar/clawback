# CLAUDE.md — Clawback

AI agent that audits a hotel's OTA relationship (Booking/Expedia): finds wrongly-billed commissions (Sentinel daily + Auditor monthly) and repeat guests still booking via OTA (Win-Back via RFM). Built for RAISE Summit Hackathon 2026, Vultr track. **Deadline: Sunday July 5, 4:00 a.m. Oaxaca time.**

## The one rule

**[HACKATHON.md](HACKATHON.md) is the single source of truth. Scope is CLOSED.** Do not add features not listed there. When in doubt, choose the simplest implementation that makes the demo screens work. The demo is choreographed: seeded data (§7) must produce exactly the findings S0, D1–D4, W, LR — each case is explained in plain language in [docs/CASOS_DEMO.md](docs/CASOS_DEMO.md). Build toward the 1-minute video script (§10).

Non-goals (never build): vector DB, real PMS/extranet/OTA integrations, real WhatsApp/email, auth, guest chatbot, PDF parsing, mobile layout.

## Commands

```bash
npm install          # workspaces: server + web
npm run seed         # rebuild server/db/clawback.db from scratch (safe to re-run)
npm run dev          # server :3001 (API_PORT) + web :5173 (Vite, proxies /api)
npm run typecheck    # tsc on both packages
npm run build        # web production build → web/dist (Express serves it if present)
```

No `ANTHROPIC_API_KEY` in `.env` → the audit stream replays a scripted choreography (`server/agent/fakeFeed.ts`) and chat uses a canned fallback. With the key → real tool-use loop. Frontend work should never require the key.

## Architecture (all Phase 0 code works end-to-end — extend, don't rewrite)

- `server/agent/loop.ts` — tool-use loop, 3 phases (SENTINEL → AUDITOR → WIN-BACK). Emits SSE events: `plan | retrieve | finding | tool | decision | learned | phase | done | error`. ⚠ TRACK REQUIREMENT (HACKATHON.md §13): core reasoning MUST run on **VultronRetriever Prime (Qwen3.5 8B) via Vultr Serverless Inference** using the OpenAI-compatible API (`openai` SDK + `baseURL` → Vultr endpoint, env `VULTR_INFERENCE_API_KEY`). The prototype used the Anthropic SDK — the event build swaps the client, keeping the same loop/tools/events. Claude allowed only for secondary tasks.
- `server/agent/tools.ts` — 13 tool definitions + handlers. Tools are the integration boundary: they read SQLite + markdown docs and write findings back. **The agent never computes totals — it persists findings via `draft_dispute_memo` / `draft_guest_message`; `/api/report` aggregates from SQLite.** Keep it that way so Overview = Disputes = Report always.
- `server/db/seed.ts` — ALL synthetic data, choreographed cases labeled S0/D1/D2/D3/D4/W/LR with comments. S0 (#1327) uses dynamic dates ("yesterday") so the 36h countdown works whenever the demo runs.
- `server/routes/index.ts` — API surface per HACKATHON.md §8. SSE broadcast at `/api/audit/stream`.
- `server/routes/chat.ts` — same persona + tools, conversational; corrections → `save_learned_rule` → `ruleLearned` in response → green banner in UI.
- `data/documents/*.md` — OTA contracts + hotel policies the agent literally reads. Citation ids: `BKG-§4.2`, `EXP-§6.3`, `POL-02`, `LAD-02`, `PMS-1284`, `LOG-0709`, `INV-L23`. `/api/documents/:id` resolves any citation for the side panel.
- `web/src/screens/` — the six screens (Overview, Agent, Disputes, WinBack, Report, Chat). `web/src/lib/useAuditStream.tsx` holds the single shared SSE connection.

## Conventions

- TypeScript strict everywhere; tsx (no compile step server-side).
- Server env var is `API_PORT` (not `PORT` — preview tools inject PORT for the web server).
- Money: MXN, always visible in UI (`mxn()` helper). Currency amounts in seed are examples — keep totals consistent across screens when tuning.
- UI: dark #111820, coral #ff6b4a, Inter + JetBrains Mono (Tailwind v4 theme vars in `web/src/index.css`). English UI; hotel name "Hotel Casa Alaria".
- The word "dashboard" is BANNED everywhere (UI, README, video, submission copy) — organizers disqualify "any project where a dashboard is the main feature". The screen is "Overview"; the project is an "enterprise agent"; on-screen figures are attributed to the agent phase that produced them.
- Grep for `TODO(Block N)` — each maps to the 48h plan block in HACKATHON.md §9.
- Domain rule that drives all audit logic: **commission follows the money the hotel KEPT** (FLEX refunds → commission on retained nights; NR keeps all → full commission is valid). D1 vs D4 is the demo's judgment moment — never break that contrast.
- If a block overruns, cut scope in this order: Margin Report screen → D3 → Win-Back Edit button → chart animations. Never sacrifice: glass brain, D1+D4 contrast, chat correction, deploy, video.
