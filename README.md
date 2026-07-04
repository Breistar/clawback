# Clawback — the AI agent that claws your money back from OTAs

Built by **Team GROVA** for the **RAISE Summit Hackathon 2026 — Vultr track**.

Clawback is a web-based enterprise agent for independent hotels. It audits the hotel's entire OTA (Booking.com / Expedia) relationship, disputes commissions billed incorrectly, and wins back the direct-booking revenue lost to guests who are already loyal but still book through a middleman.

## The problem

OTAs bill on what was *booked*, not what was actually *stayed and paid for*. Independent, non-chain hotels have no revenue-management team to catch the difference, and the numbers add up fast:

- A 300-room property can leak on the order of **$130,000/year** in commission overcharges that nobody ever disputes.
- One documented case: an independent hotel overpaid **€35–40K/month** before anyone noticed the pattern.
- Dispute windows close in **48 hours to 14 days** — by the time a monthly reconciliation happens by hand, most of them are already gone.
- Meanwhile, guests who would happily rebook directly keep arriving through the OTA anyway, because nobody tracks who they are or reaches out before their next trip — so the hotel keeps paying 15–17% commission on loyalty it already earned for free.

Enterprise chains solve this with dedicated revenue teams and paid audit firms. Independent hotels — the majority of the industry — have neither the headcount nor the tooling. Clawback is that missing team, running as an agent instead of a hire.

## What Clawback does

One agent, three phases, run on demand from **Run Full Audit**:

| Phase | What it catches | How |
|---|---|---|
| **Sentinel** (daily, prevention) | No-shows and early departures not yet marked on the OTA extranet, before they get invoiced | Sweeps yesterday's PMS events against each OTA's marking window and raises an alert with a live countdown |
| **Auditor** (monthly, recovery) | Commissions billed on money the hotel never kept — wrong base, unprocessed corrections, missing evidence | Reads every invoice line against the PMS record, the extranet log and the OTA contract clause, and decides `DISPUTABLE`, `NOT_DISPUTABLE` or `VERIFY` |
| **Win-Back** | Repeat guests who are loyal in practice but still book via OTA, burning commission every time | RFM segmentation over 18 months of stay history, personalized direct-booking offer built from the hotel's own benefit ladder |

Every decision is grounded in a document or record with a clickable citation (`BKG-§4.2`, `PMS-1284`, `LOG-0709`…), carries a confidence score with a stated reason, and the manager can question or correct the agent in **Chat** — corrections become **learned rules**, applied automatically to every future audit.

The domain rule behind every dispute decision: **commission follows the money the hotel kept, not the nights the guest booked.** A refundable (FLEX) rate that gets partially refunded means commission is due only on what's retained; a non-refundable (NR) rate means the full commission is valid even if the guest checked out early. The demo's judgment moment (`D1` vs `D4`) is exactly this: two reservations with the same symptom, opposite verdicts, because the agent follows the money instead of a shallow pattern match.

## How this meets the Vultr track

| Requirement | How Clawback satisfies it |
|---|---|
| Plans | Every phase opens with a stated plan, including known exemptions (learned rules) before any decision |
| Retrieves more than once, reactively | A finding triggers the next retrieval — invoice line → PMS record → extranet log → contract clause → policy — not a fixed pipeline |
| Calls tools | 13 tools are the only way the agent touches data: it never invents a number, it reads and computes through them |
| Makes decisions | Every audited reservation gets a decision (`DISPUTABLE` / `NOT_DISPUTABLE` / `VERIFY` / `AT_RISK`) with a confidence score and a reason |
| Enterprise outcome | Persisted dispute memos, guest offer drafts and a margin report a hotel manager could act on directly |
| VultronRetriever for retrieval | `get_contract_clause` and `get_policy` route every lookup through **VultronRetriever Prime** (`/v1/rerank`) against the split contract/policy sections — with an offline heading-match fallback so frontend work is never blocked on API access |
| Core reasoning on Vultr | The tool-use loop runs on **`moonshotai/Kimi-K2.6`** via Vultr Serverless Inference's OpenAI-compatible `/v1/chat/completions` endpoint |

## Architecture

```
┌─────────────┐   SSE (/api/audit/stream)   ┌──────────────────────────┐
│  React web  │ ◄────────────────────────── │  Express API              │
│  (Vite/TS)  │ ── POST /api/audit/run ───► │  server/agent/loop.ts     │
│  6 screens  │                              │  (tool-use loop, 3 phases)│
└─────────────┘                              └──────────┬────────────────┘
                                                          │ tool calls
                                              ┌───────────▼────────────┐
                                              │  server/agent/tools.ts │
                                              └───┬───────────────┬────┘
                                   reads/writes   │               │ document retrieval
                                     ┌────────────▼───┐   ┌───────▼─────────────────┐
                                     │ SQLite (better- │   │ VultronRetriever Prime  │
                                     │ sqlite3)        │   │ /v1/rerank on Vultr     │
                                     └─────────────────┘   └──────────────────────────┘
                                                          reasoning: Kimi-K2.6
                                                          on Vultr Serverless Inference
```

- **Frontend** — React + Vite + TypeScript + Tailwind v4. Six screens: Overview, Agent (glass brain), Disputes, Win-Back, Report, Chat. One shared SSE connection (`web/src/lib/useAuditStream.tsx`) feeds the live agent events to every screen.
- **Backend** — Node.js + Express + TypeScript, `tsx` (no build step). SQLite holds all structured data; the agent never computes totals itself — it persists findings through tools, and `/api/report` aggregates from the database, so Overview, Disputes and Report always agree.
- **Documents** — `/data/documents/*.md`: the two OTA contracts, hotel policies and the benefit ladder. The agent literally reads these; no vector database, because two-page contracts don't need one — VultronRetriever reranks sections directly.
- **Deploy** — single Docker container: Express serves the built frontend and the API from one process, deployed on a Vultr VPS.

## Quick start (local)

```bash
npm install
cp .env.example .env        # add VULTR_INFERENCE_API_KEY
npm run seed                # creates + seeds server/db/clawback.db
npm run dev                 # server :3001 (API_PORT) + web :5173 (Vite, proxies /api)
```

Open http://localhost:5173 → **Overview** → **▶ Run Full Audit**.

**No API key?** The audit stream falls back to a scripted replay of the exact same choreographed findings, and chat uses a canned offline reply — so the full demo works with zero external dependencies. With a key set, the real Vultr tool-use loop and reranker run instead.

## Production

```bash
docker compose up --build   # single container: Express serves built web + API, port 3001
```

## Demo guide — what to click

The seeded month reproduces seven choreographed findings every time the database is (re)built:

| Case | Screen | What you'll see |
|---|---|---|
| **S0** | Overview / Agent / Disputes | A no-show from last night, unmarked on the Booking extranet — live countdown, `$1,850` at risk |
| **D1** | Disputes | Early departure on a FLEX rate, refunded 2 nights, billed commission on 7 — `DISPUTABLE`, `HIGH`, `$756` recovered |
| **D2** | Disputes | No-show marked on time, billed in full anyway — `DISPUTABLE`, `HIGH`, `$2,120` |
| **D3** | Disputes | Commission computed on the wrong base, but the check-out record is missing — `VERIFY`, `MEDIUM` |
| **D4** | Disputes | Same symptom as D1 (early departure) but on a non-refundable rate — `NOT_DISPUTABLE`, `HIGH`. **D1 and D4 side by side is the judgment moment.** |
| **W** | Win-Back | Carlos M. (★ Champion, 5 stays, Booking) and Laura R. (Loyal, Expedia) — RFM segments, burned commission, personalized offers |
| **LR** | Chat / Agent plan | A pre-seeded exemption (corporate agreement) the agent announces before deciding anything |

Then, in **Chat**, tell the agent about another exemption (e.g. *"we have a special agreement with X, don't dispute their invoices"*) and watch the green **✓ RULE LEARNED** banner — the rule is persisted and will be applied on the next audit run.

Full plain-language explanation of every case: [`docs/CASOS_DEMO.md`](docs/CASOS_DEMO.md) (Spanish). Developer onboarding: [`docs/GUIA_DEV.md`](docs/GUIA_DEV.md) (Spanish). Full spec: [`HACKATHON.md`](HACKATHON.md).

## Roadmap

- Real PMS / OTA extranet integrations (today: synthetic data standing in for both)
- Sending win-back offers over WhatsApp/email through GROVA's existing guest-messaging infrastructure
- A "Renegotiate" module: use twelve months of audited leakage as leverage in the next OTA contract renewal
- Multi-property support for small hotel groups

## Team

**GROVA** — Oaxaca, México · Nicaragua · Paris. Born from GROVA's real engagement with an independent hotel in Oaxaca running 60%+ OTA dependency.

---

*All data in this repository (guests, reservations, invoices) is synthetic demo data generated by `server/db/seed.ts`. "Hotel Casa Alaria" is a placeholder name — no real client is represented.*
