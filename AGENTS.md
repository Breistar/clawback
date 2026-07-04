# Agent context — Clawback

Read [CLAUDE.md](CLAUDE.md) — it is the full agent context for this repo (architecture, commands, conventions, scope rules). The spec is [HACKATHON.md](HACKATHON.md) and scope is CLOSED: do not add features not listed there. Human onboarding guide (Spanish): [docs/GUIA_DEV.md](docs/GUIA_DEV.md).

## Cursor Cloud specific instructions

Standard commands live in [CLAUDE.md](CLAUDE.md) (`npm run dev | seed | typecheck | build`). The update script already runs `npm install` + `npm run seed`, so the SQLite DB (`server/db/clawback.db`, gitignored) exists on a fresh VM. Non-obvious notes:

- **No API key is needed to run/demo.** Without `VULTR_INFERENCE_API_KEY` the audit loop replays a scripted choreography (`server/agent/fakeFeed.ts`) and chat uses a canned fallback — enough to exercise every screen end-to-end. A key only swaps in the real Vultr tool-use loop.
- **Findings are empty until an audit runs.** `GET /api/disputes` / `/api/report` return zeros until the agent persists findings. Trigger it via the UI **Agent → Run Full Audit**, or `POST /api/audit/run` (SSE at `GET /api/audit/stream`). `POST /api/seed/reset` wipes findings back to the clean choreography state.
- **Ports:** server is `API_PORT` (default 3001), NOT `PORT` (Vite/preview tooling injects `PORT`). Web dev server is Vite on 5173 and proxies `/api` → 3001. Run both with `npm run dev` from the repo root.
- This workspace also contains the sibling `clawback-prototype` repo — the pre-event reference/spec build. Same stack and commands; the two are independent git repos.
