# CLAWBACK — Mission Document (HACKATHON.md)
## RAISE Summit Hackathon 2026 · Vultr Track · Hospitality
### Team GROVA · July 4–5, 2026 · THIS FILE IS THE SINGLE SOURCE OF TRUTH

> **How to use this file (Claude Code):** This is the complete, final specification. Scope decisions are CLOSED — do not add features not listed here. When in doubt, choose the simplest implementation that makes the demo screens work. The demo is choreographed: the seeded data in Section 7 must produce exactly the findings described. Build toward the 1-minute video script (Section 10).

---

## 1. WHAT WE ARE BUILDING (one paragraph)

**Clawback** is a web-based Enterprise Agent for independent hotels that audits their entire OTA (Booking.com / Expedia) relationship. It finds money leaking in two ways: **(1) Dispute** — commissions billed incorrectly (no-shows, shortened stays, wrong rates, unapplied corrections), caught daily by a *Sentinel* (prevention, before invoicing) and monthly by an *Auditor* (recovery, invoice line-by-line vs contracts); **(2) Win-Back** — commissions burned on repeat guests who still book via OTAs, identified via RFM analysis and converted with personalized direct-booking offers built from the hotel's benefit ladder (including cross-sell: restaurant, tours). Every decision is grounded in documents with clickable citations, carries a confidence score, and the manager can interrogate and correct the agent via chat — corrections become **learned rules** applied to all future audits.

**Tagline:** *Clawback — the AI agent that claws your money back from OTAs.*
**Origin story (pitch only):** born from GROVA's real engagement with an independent hotel in Oaxaca, México (60%+ OTA dependency). Product, UI, README and video are in **English**.

---

## 2. JUDGING RUBRIC (build for this)

Vultr's statement demands (verbatim keywords): web-based Enterprise Agent · grounds decisions in documents · **plans** · **retrieves more than once when it needs to** · **calls tools** · **makes decisions** · produces an outcome a real enterprise team could actually use. A single retrieve-then-answer call is NOT enough.

Our proof points, in order of demo impact:
1. **Glass brain:** the agent's reasoning streams live — plan, each retrieval, each calculation, each decision with citation.
2. **Reactive retrieval chain:** a finding TRIGGERS the next retrieval (invoice line → PMS → contract clause → rate policy → charge folio). Not a fixed pipeline.
3. **Judgment:** at least one finding is explicitly **NOT disputable** (rate was non-refundable, hotel kept the money → commission is correct).
4. **Confidence scores** with reasons ("evidence complete" vs "missing check-out record — verify first").
5. **Learned rules:** manager corrects via chat → green "RULE LEARNED" banner → rule persisted and applied.
6. **Money on screen:** every screen speaks in currency. Final number is memorable.

---

## 3. TECH STACK (decided — do not change)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React + Vite + TypeScript + Tailwind** | Team's known stack (same as prior hotel project) |
| Backend | **Node.js + Express + TypeScript** | Single language across the stack; easy SSE streaming |
| Agent brain | **VultronRetriever Prime (Qwen3.5 8B) via Vultr Serverless Inference** — OpenAI-compatible API (`openai` SDK pointed at the Vultr endpoint), tool-use loop. ⚠ TRACK REQUIREMENT (see §13): VultronRetriever must power ALL core reasoning steps; Claude/other models allowed ONLY for chat facilitation, UI interactions or secondary tasks | Mandatory per official Vultr track doc — "el flujo empresarial principal debe estar impulsado por modelos VultronRetriever" |
| Live agent feed | **SSE (Server-Sent Events)** from backend to frontend | Simplest reliable streaming for the glass brain |
| Structured data | **SQLite** via `better-sqlite3` | Zero-config, file-based, perfect demo scale. Tables: reservations, guests, stays, invoice_lines, extranet_log, learned_rules, disputes, offers |
| Documents | **Markdown files** in `/data/documents/` (contracts, policies, benefit ladder) | The agent literally *reads documents* — fits the track requirement; contracts are 2 pages, no vector DB needed |
| Doc retrieval | Simple file/section reader tool (`get_contract_clause` reads the md file, returns the clause by § id) | At this scale semantic search is overkill; determinism > cleverness |
| Charts | **Recharts** | North Star chart |
| Deploy | **Vultr VPS** (single instance) + Docker (single container: Express serves built frontend + API) | Track REQUIREMENT: "backend desplegado en Vultr" + public demo URL. Attend Vultr workshop (Sat 4:00 a.m. Oaxaca) to confirm exact model ids + credits |
| Secrets | `.env` → `VULTR_INFERENCE_API_KEY` (+ optional `ANTHROPIC_API_KEY` for secondary tasks only), `API_PORT` | Never commit |

**Explicit non-goals (do NOT build):** vector database, real PMS/extranet/OTA integrations, real WhatsApp/email sending, authentication/multi-tenant, guest-facing chatbot, PDF parsing (invoices are stored structured in SQLite; a PDF-looking invoice *view* in the UI is fine), mobile layout.

---

## 4. REPO STRUCTURE

```
clawback/
├── HACKATHON.md            ← this file
├── README.md               ← judge-facing (Section 11)
├── docker-compose.yml / Dockerfile
├── /server
│   ├── index.ts            ← Express + SSE + static serve
│   ├── agent/
│   │   ├── loop.ts         ← Anthropic tool-use loop, streams events
│   │   ├── tools.ts        ← tool definitions + handlers
│   │   └── prompts.ts      ← system prompt(s)
│   ├── db/
│   │   ├── schema.sql
│   │   └── seed.ts         ← generates ALL synthetic data (Section 7)
│   └── routes/  (audit, disputes, winback, report, chat, rules)
├── /web                     ← Vite React app
│   └── src/screens/ (Dashboard, Agent, Disputes, WinBack, Report, Chat)
└── /data
    └── documents/
        ├── booking_contract.md
        ├── expedia_contract.md
        ├── hotel_policies.md      ← cancellation, no-show, rate plans
        └── benefit_ladder.md      ← RFM segment → offer rules
```

---

## 5. AGENT DESIGN

**One agent, one tool-use loop, three phases** (Sentinel → Auditor → Win-Back), run by "Run Full Audit". Each phase streams events to the UI via SSE. Event types: `plan`, `retrieve`, `finding`, `tool`, `decision`, `learned`, `phase`, `done`.

**System prompt core rules:**
- You are Clawback, an OTA-relationship auditor for Hotel Casa Alaria (placeholder name — confirm before submitting).
- Ground EVERY decision in retrieved evidence; always cite source ids (e.g. `BKG-§4.2`, `PMS-1284`, `LOG-0709`, `POL-02`, `INV-L23`).
- Commission follows the money the hotel KEPT, not nights booked: rate plan (FLEX/NR) → applicable policy → money retained → correct commission → compare vs billed.
- Before any decision, call `get_learned_rules` and apply exemptions.
- Decisions: `DISPUTABLE` / `NOT_DISPUTABLE` / `VERIFY`, each with confidence HIGH/MEDIUM/LOW + reason.
- Be concise in feed messages; money amounts always visible.

**Tools (`tools.ts`):**
| Tool | Does |
|---|---|
| `sentinel_sweep()` | Returns yesterday's PMS events not yet marked in each OTA's extranet_log |
| `get_invoice_lines(ota)` | Invoice lines for the month |
| `get_reservation(id)` | PMS record: nights booked/stayed, rate_plan (FLEX/NR), amount_charged, amount_refunded, status |
| `get_extranet_log(reservation_id)` | Marking history per OTA |
| `get_contract_clause(ota, topic)` | Returns the clause (id + text) from the contract md |
| `get_policy(topic)` | Hotel policy section (cancellation, rate plans, benefit ladder) |
| `commission_calculator(base, pct)` | Deterministic math |
| `run_rfm()` | Computes R/F/M scores + segments over 18-month guest history; returns repeat-guests-via-OTA with burned commission |
| `check_availability(room_type, period)` | For upgrade offers |
| `draft_dispute_memo(finding)` | Persists memo (evidence list, amount, window deadline) |
| `draft_guest_message(guest, offer)` | Persists offer preview |
| `get_learned_rules()` / `save_learned_rule(rule)` | Learned-rules store |

**Chat endpoint:** same agent persona + tools, conversational. Must support: (a) "why did you flag X?" → defends with citations; (b) corrections → calls `save_learned_rule`, recomputes affected totals, UI shows green banner.

---

## 6. SCREENS (build exactly these six — mockups exist)

1. **Overview** (never call it "Dashboard" — banned-category framing, see §13): 3 money cards, each attributed to its agent phase — "At risk TODAY $1,850 ⏱ Sentinel caught it — 36h left" (coral, alarmed) / "Disputable this month $28,400 · found by the Auditor · window closes in 5 days" / "Recoverable every month $12,300 · Win-Back: 12 repeat guests". North Star chart (OTA share 60% today → 48% projected · Annual savings $147,600 MXN). Documents-loaded panel (PARSED/INDEXED/SYNCED chips). **[▶ Run Full Audit]** button.
2. **Agent (glass brain):** live SSE feed; color-coded left borders (plan=blue, finding=amber, tool=purple, decision=green/red); citation chips clickable → opens the source document/record in a side panel.
3. **Disputes:** table — reservation, finding, amount, status pill (⏱ 36H LEFT / DISPUTABLE / NOT DISPUTABLE), confidence pill, evidence, [View memo]. Header shows per-OTA window countdowns.
4. **Win-Back:** guest cards — avatar, segment pill (★ CHAMPION / LOYAL / PROMISING / DORMANT), R/F/M/Channel metrics, "Commission burned: $X per visit · ~$Y/year" (coral strip), agent's offer text (per benefit ladder, incl. cross-sell + post-stay review invite), [✓ Approve message] [Edit].
5. **Margin Report:** the executive one-pager: prevented today + disputable this month + recoverable monthly + North Star + list of actions. (Simple, mostly assembled from prior data.)
6. **Chat:** manager ↔ agent; supports interrogation + correction; green "✓ RULE LEARNED: …" banner; totals update after corrections.

Visual language: **the frontend owner's call** — the prototype palette (dark/coral) was a placeholder proposal, not a decision. Free to restyle entirely. Non-negotiables (function, not aesthetics): English UI · money amounts always prominent · agent-feed event types visually distinguishable at a glance (plan/retrieve/finding/decision) · citation chips clearly clickable · the AT-RISK countdown must read as urgent · never the word "dashboard".

---

## 7. SYNTHETIC DATA (seed.ts must produce EXACTLY these findings)

**Hotel:** "Hotel Casa Alaria" (placeholder — confirm), ~90 rooms, colonial-city center, México. Own restaurant + tour agency. Currency MXN (show USD equivalent in README/video).

**Volume:** Booking invoice ~30 lines, Expedia ~15. PMS: the month's stays. Guest history: 18 months, ~200 guests. Rate plans: only FLEX and NR.

**Contracts (2 pages each, 6–8 numbered clauses, DIFFERENT values):**
- Booking: commission 17% · no-show marking window 48h · invoice dispute window 7 days · shortened-stay clause §4.2 · non-commissionable charges §7
- Expedia: commission 15% · marking window 72h · invoice dispute window 14 days · late-cancellation penalty §6.3

**Seeded findings (the choreography):**
| # | Case | Data setup | Expected agent outcome |
|---|---|---|---|
| S0 | **Sentinel live catch** | Res #1327: no-show "last night", extranet_log has NO mark; Booking §5.1 window 48h → 36h remain | Alert + countdown + $1,850 at risk + [Mark on extranet] |
| D1 | **Early departure, FLEX** | Res #1284: booked 7 / stayed 5, rate FLEX, hotel refunded 2 nights; invoice bills commission on 7 | DISPUTABLE · HIGH · overcharge $756 (cites PMS-1284 + BKG-§4.2 + POL-02) |
| D2 | **Marked but billed** | Res #1298: no-show marked on time (LOG-0709) yet invoice line 23 bills full $2,120 | DISPUTABLE · HIGH · "the OTA did not process the correction" |
| D3 | **Rate mismatch, incomplete evidence** | Res #1305 (Expedia): commission computed on a rate ≠ amount charged to guest; check-out record intentionally missing | DISPUTABLE · **MEDIUM** · "verify before sending" |
| D4 | **NOT disputable (judgment moment)** | Res #1310: booked 7 / stayed 5 — but rate **NR**, hotel kept full payment | NOT_DISPUTABLE · HIGH · "commission follows money retained, charge is contractually valid" — same symptom as D1, opposite diagnosis |
| W | **Win-Back set** | 5–6 repeat guests via OTA incl. Carlos M. (Champion: 5 stays, R=21d, $16,500/stay, Booking, burn $2,480/visit) and Laura R. (Loyal: 3 stays, Expedia, restaurant history → cooking-class cross-sell) | RFM segments + offers per benefit_ladder.md (Champion: NO discount — upgrade w/ availability check + tour pricing + priority table; post-stay Google review invite) |
| LR | **Pre-seeded learned rule** | One exemption already in learned_rules (e.g., corporate agreement) | Agent mentions it during planning: "1 exemption on file" |

**Totals must be consistent** so Dashboard = Disputes = Report. Target memorable figure: ~$47,000 MXN/quarter combined.

---

## 8. API SURFACE (minimal)

```
POST /api/audit/run          → starts agent loop; SSE stream at /api/audit/stream
GET  /api/disputes           → findings + memos
GET  /api/winback            → segments + offers
GET  /api/report             → margin report aggregate
POST /api/chat               → {message} → streamed agent reply (may mutate rules)
GET  /api/rules              → learned rules
GET  /api/documents/:id      → raw doc/section for citation side panel
POST /api/seed/reset         → re-seed database (demo reset button, hidden)
```

---

## 9. 48-HOUR PLAN (Oaxaca time, GMT-6)

| Block | When | Goal (definition of done) |
|---|---|---|
| 0 | Sat 2:00–4:00 | Opening ceremony. Repo scaffolded locally (allowed: setup only, no product code before flag-off per rules — confirm in Discord) |
| 1 | Sat 4:00–4:40 | **Flag-off.** Attend **Vultr workshop 4:10** (one person), rest: repo + schema + seed.ts skeleton |
| 2 | Sat 4:40–8:00 | seed.ts complete (all Section 7 data verifiable via SQL), documents written, Express + SSE skeleton streaming fake events to a bare Agent screen |
| 3 | Sat 8:00–13:00 | Agent loop + tools working end-to-end on D1 and D4 (the contrast pair). Glass brain renders real events with citations |
| 4 | Sat 13:00–18:00 | Sentinel (S0) + D2 + D3 + Disputes screen + memos + countdowns |
| 5 | Sat 18:00–22:00 | RFM tool + Win-Back screen + benefit ladder offers + Dashboard with real aggregates + North Star |
| 6 | Sat 22:00–Sun 0:30 | Chat: interrogation + correction + learned rule banner + totals recompute. Margin Report screen |
| 7 | Sun 0:30–1:30 | **Deploy to Vultr.** Freeze features. `seed/reset` tested |
| 8 | Sun 1:30–3:00 | **Record 1-min video** (script Section 10) + README + submission form + screenshots |
| 9 | Sun 3:00–4:00 | Buffer. Submit NO LATER than 3:30. Deadline 4:00 sharp |

**Rules of engagement:** if a block overruns, CUT scope (order of sacrifice: Margin Report screen → D3 → Win-Back Edit button → chart animations). Never sacrifice: glass brain, D1+D4 contrast, chat correction, deploy, video.

---

## 10. 1-MINUTE VIDEO SCRIPT (build toward these shots)

1. 0:00–0:10 — Problem: "Hotels lose money to OTAs twice: commissions billed wrong, and commissions paid on guests who are already loyal. Nobody audits it — dispute windows close in days."
2. 0:10–0:20 — "Meet Clawback: the AI agent that audits your entire OTA relationship." (glass brain reasoning FIRST, then Overview's 3 money cards as its output — the agent must appear before any screen of numbers)
3. 0:20–0:35 — Sentinel catch: countdown "36h left — $1,850 at risk". Then glass brain: finding → contract clause → recalculation → memo with citations.
4. 0:35–0:48 — Win-Back: RFM, Carlos the Champion, burned commission, ladder-built offer.
5. 0:48–0:55 — Chat correction → "✓ RULE LEARNED" banner.
6. 0:55–1:00 — Margin Report figure. "Built in 48 hours. Born from a real hotel in Oaxaca, México. **Clawback — claw your money back.**"

---

## 11. README OUTLINE (judge-facing, English)

Problem (with industry stats: OTAs bill as-booked not as-stayed; ~$130K/yr leakage at a 300-room property; €35–40K/mo overpayment case; 48h–7d windows) → Why independent hotels are unprotected (enterprise tools only) → What Clawback does (Sentinel/Auditor/Win-Back, learned rules) → How it meets the track (plans / multi-retrieval / tools / decisions / enterprise outcome — table) → Architecture diagram → Demo guide (what to click, what the seeded month contains) → Roadmap (real PMS/extranet integrations, WhatsApp sending via GROVA's existing infra, Renegotiate module) → Team GROVA, Oaxaca–Nicaragua → Paris.

---

## 12. SUBMISSION CHECKLIST (Sun before 4:00 a.m. Oaxaca — via Cerebral Valley form)

Submit at: https://cerebralvalley.ai/e/raise-summit-hackathon/hackathon/submit

- [ ] Project info + team form
- [ ] GitHub repo — **must be PUBLIC** (README complete, .env.example, seed instructions)
- [ ] Live demo URL on Vultr (seeded, Run Full Audit works unattended)
- [ ] 1-minute video (Loom/YouTube) — **for remote teams this IS the pitch**: judges score video + description + repo only, no live demo
- [ ] Any extra docs the form requests
- [ ] Confirm placeholder hotel name replaced/approved · never use the real client's name

## 13. OFFICIAL RULES DELTA (from Participant Resources — overrides anything above that conflicts)

**Compliance (disqualification risks — take seriously):**
- **New Work Only:** the project must be built ENTIRELY during the event (hacking window: Sat 11:30 Paris / 3:30 a.m. Oaxaca → Sun 12:00 Paris / 4:00 a.m. Oaxaca). The pre-event prototype repo stays private and is reference/spec ONLY — the submitted repo is created empty at flag-off and all code is written (not copy-pasted) during the window. Git history is the judges' evidence.
- **Public repo** required at submission.
- **Banned category adjacency:** "any project where a dashboard is the main feature" is disqualified. Framing everywhere (video, README, description): Clawback is an **agent** (plans, retrieves, decides, learns); the dashboard is merely where its output lands. Never describe it as a dashboard.

**Judging (remote):** no live pitch. Scored on demo video + project description + GitHub repo. Weights: Demo 50% · Impact 25% · Creativity 15% · Pitch 10%. The chat-correction "RULE LEARNED" moment must be IN the video.

**Vultr specifics — CONFIRMED ARCHITECTURE (smoke-tested against the live API on Sat morning):**
- Endpoint: `https://api.vultrinference.com/v1` (OpenAI-compatible). Env var: `VULTR_INFERENCE_API_KEY`.
- **Reality check from `/v1/models`: the three VultronRetriever models expose feature `ReRank` only — they are retrieval/reranking models, NOT chat models.** They cannot generate text. Therefore the compliant architecture is:
  - **Reasoning/generation:** `Qwen/Qwen3.6-27B` via `/v1/chat/completions` — **native tool calling VERIFIED working** (called `get_reservation {"id":1284}` on first try). Alternatives available on the same endpoint if needed: `moonshotai/Kimi-K2.6`, `deepseek-ai/DeepSeek-V4-Flash`.
  - **Document retrieval:** `vultr/VultronRetrieverPrime-Qwen3.5-8B` via `/v1/rerank` (`{model, query, documents[]}` → ranked results with relevance_score). **VERIFIED: correctly ranked BKG-§4.2 top for the shortened-stay query.** Wire it inside `get_contract_clause`/`get_policy`: split the md into sections, rerank against the query, return the top section (cite its § id). Every retrieval step goes through VultronRetriever → satisfies "VultronRetriever for document retrieval" with real usage.
  - Both models run on Vultr Serverless Inference → "core reasoning on Vultr" satisfied end-to-end.
- Ask in Discord for written confirmation of this interpretation ("VultronRetriever models expose ReRank only; core loop on a Vultr-hosted TextGeneration model + VultronRetriever powering every retrieval step — correct?") and screenshot the answer.
- Claude/other non-Vultr models: only for secondary tasks, if at all; declare in README.
- Deliverables checklist from the track doc: GitHub repo w/ setup docs · backend deployed on Vultr · VultronRetriever usage · public demo URL · demo video · clear architecture/agent-flow/use-case explanation.
- Bonus points: creative multi-agent designs, tool use, robust handling of messy real-world documents.
- GPUs NOT available; $200 credits per participant — EVERY team member claims credits Saturday morning.

**Schedule correction:** hacking starts Sat **3:30 a.m.** Oaxaca (not 4:00) — Block 1 gains 30 minutes. Sponsor workshops at 4:00 a.m. Oaxaca. Submissions due Sun 4:00 a.m. Oaxaca sharp (12:00 PM Paris).

**Team:** remote teams 1–5 members, entirely remote ✓.
