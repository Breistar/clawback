# Clawback 🦅

**The AI agent that claws your hotel's money back from OTAs.**

Built in 48 hours for the RAISE Summit Hackathon 2026 · Vultr track · Team GROVA
**Live demo:** http://108.61.209.3 · **Video:** https://youtu.be/KXCn8HMAAfI

---

## The problem

Independent hotels run on Booking.com and Expedia — and pay 15–20% commission on every booking. Money leaks out of that relationship in two ways nobody audits:

1. **They bill you as booked, not as stayed.** No-shows, shortened stays, and corrections the OTA never processed all get invoiced anyway. Industry analyses estimate **~$130K USD/year** of leakage at a 300-room property; one European group overpaid **$35–40K/month** before auditing line by line. Dispute windows close in as little as **48 hours**, the process is fully manual, and every OTA has a different contract.
2. **You keep paying commission on guests who are already loyal.** The guest on his fifth stay still books through Booking — 17% burned on someone who would book direct.

Enterprise reconciliation tools exist — for large chains with revenue teams to run them. The independent hotel, the one with the least staff, is the least protected.

## What Clawback does

One autonomous agent, three phases, one click:

- **🔔 SENTINEL (daily · prevention):** sweeps yesterday's PMS events against each OTA's extranet log. Unmarked no-show? It reads *that OTA's contract* for the marking window and raises the alarm with a live countdown: *"36 hours left — $1,850 at risk."* Money that never gets billed.
- **📄 AUDITOR (monthly · recovery):** reconciles every invoice line against the PMS record, the extranet log, the contract clause, and the hotel's rate policies. Recalculates every commission and decides **DISPUTABLE / NOT DISPUTABLE / VERIFY** — each with a confidence score and its reason. Files ready-to-send dispute memos inside the window.
- **💌 WIN-BACK (growth):** runs RFM over 18 months of guest history, computes the commission burned per repeat OTA guest, and drafts personalized direct-booking offers under the hotel's written **benefit ladder** (champions get upgrades, never discounts — with availability checked before offering).

**The judgment moment:** two reservations with the identical symptom — booked 7 nights, stayed 5. One is DISPUTABLE ($756 back: the hotel refunded the unused nights, so commission is due only on money retained). The other is NOT DISPUTABLE (non-refundable rate: the hotel kept every peso, the charge is valid). A rules engine flags both. **An auditor with judgment knows the difference — because commission follows the money.**

**And it learns:** correct the agent in chat (*"don't dispute 1284, special agreement"*) → green **RULE LEARNED** banner → every total recomputes instantly → the rule persists and applies itself in every future audit.

## How it meets the track

| Track requirement | Where Clawback does it |
|---|---|
| Web-based enterprise agent | The manager's six-screen web app, driven end-to-end by the agent |
| Grounds decisions in documents | OTA contracts, hotel policies, PMS records, extranet logs, invoice lines — every decision carries clickable citations (`BKG-§4.2`, `PMS-1327`, `LOG-0709`) |
| Plans | Announces its plan per phase, including learned exemptions on file |
| Retrieves more than once, when needed | A finding triggers the next retrieval: invoice line → PMS → extranet log → contract clause → rate policy — reactive, not a fixed pipeline |
| Calls tools | 13 tools: sweep, PMS, extranet, contract retrieval, commission calculator, RFM, availability, memo/offer persistence, learned rules |
| Makes decisions | DISPUTABLE / NOT_DISPUTABLE / VERIFY with confidence + reason — including when *not* to act |
| Outcome a real team could use | Dispute memos filed within the window, approved guest messages, and an executive margin report — actionable Monday morning |

**Vultr stack (core requirement):** all agent reasoning runs on **Vultr Serverless Inference** (`moonshotai/Kimi-K2.6` driving the tool-use loop), and **every document retrieval goes through VultronRetriever** (`vultr/VultronRetrieverPrime-Qwen3.5-8B` via `/v1/rerank`) — its relevance scores are visible live in the reasoning feed. Deployed on a Vultr VPS. The demo video is voiced with **Gradium TTS** (fellow event sponsor).

## Architecture

```
React + Vite (six screens, SSE "glass brain" feed)
        │  /api (Express)
        ▼
Agent loop ── Vultr Serverless Inference (Kimi-K2.6, tool use)
   │  13 tools = the integration boundary
   ├── VultronRetriever /v1/rerank  → every contract/policy retrieval (scored)
   ├── SQLite  → reservations · invoices · extranet log · 18-month guest history
   │             (guest-history distributions modeled on 12 months of real,
   │              anonymized arrival data from the hotel)
   └── writes findings back → disputes · offers · learned_rules
        ▼
Totals are computed from SQLite, never by the model → every screen agrees
```

Self-healing orchestration: each audit sub-task verifies its finding was persisted and re-runs on endpoint stalls. Hard-won endpoint lessons (completion clamping, hidden-reasoning stalls, tool-choice degeneration) are documented in [`server/agent/loop.ts`](server/agent/loop.ts).

## Demo guide (what to click)

1. **Overview** → **▶ Run Full Audit** — watch the agent plan, retrieve (VultronRetriever scores on screen), calculate, and decide, live (~3–4 min). Click any citation chip to open the source document.
2. **Disputes** — compare **#1284** (DISPUTABLE · $756) with **#1310** (NOT DISPUTABLE): same symptom, opposite verdicts. Note **#1305**: confidence MEDIUM, *"missing check-out record — verify before sending."* The agent knows what it doesn't know.
3. **Win-Back** — Carlos (★ CHAMPION, $2,480 burned/visit) gets an upgrade, never a discount; Laura's offer includes a cooking class because *her* history shows restaurant spend.
4. **Chat** — ask *"why did you flag reservation 1284?"* (it defends with citations and math). Then correct it: *"don't dispute 1284, it was a special agreement"* → **RULE LEARNED**, totals drop.
5. **Run the audit again** — the agent announces the new exemption and honors it. Same data, different outcome: **it learned.**
6. **Report** — the executive one-pager, with the North Star: 58% of room-nights via OTA today (computed from 12 months of real channel data) → 46% projected · **$144,895 MXN/year** recoverable.

Reset for a fresh run: `POST /api/seed/reset`.

## Run it yourself

```bash
git clone https://github.com/Breistar/clawback.git && cd clawback
npm install
cp .env.example .env          # add VULTR_INFERENCE_API_KEY
npm run seed
npm run dev                   # → http://localhost:5173
```

Without a key, the audit replays a scripted choreography so the UI is still explorable. Docker deploy: [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Honest scope & roadmap

All hotel data is synthetic by design (the demo hotel is fictitious; guest-history distributions are modeled on real, anonymized aggregates). Win-Back messages are drafted for **manager approval** and target guests from the hotel's **own PMS records**. In production: real PMS/extranet integrations (the 13 tools are the integration boundary — swap their internals, nothing else changes), WhatsApp delivery through infrastructure GROVA already operates, and a **Renegotiate** module that turns audit history into contract-negotiation leverage.

## Team GROVA — Oaxaca · Nicaragua · Argentina → Paris

Breistar Sánchez (product) · Ariadna Ramírez (frontend & design) · Nelson Ramos (backend & deploy) · Rodolfo Navarro (demo & data).

The problem comes from GROVA's real consulting engagement with an independent hotel in Oaxaca, México (60%+ OTA dependency, <2% direct web bookings). The product was **built entirely during the event**. *Stop paying for bookings that never happened.*
