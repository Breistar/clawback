# Submission copy — Cerebral Valley form

**Form:** https://cerebralvalley.ai/e/raise-summit-hackathon/hackathon/submit
**Deadline:** Sunday 12:00 PM Paris (4:00 a.m. Oaxaca). Submit by 3:00 a.m. Oaxaca.
**Checklist before submitting:** repo is PUBLIC ✓ · demo URL alive and reseeded that morning · video uploaded (YouTube/Loom) · this copy pasted.

---

## Project name
**Clawback**

## Tagline
The AI agent that claws your hotel's money back from OTAs.

## Description (paste into the form)

Independent hotels lose money to Booking.com and Expedia twice. First, commissions are billed **as booked, not as stayed**: no-shows, shortened stays and unprocessed corrections get invoiced anyway, and the dispute windows close in as little as 48 hours — nobody at a 90-room hotel has time to audit line by line. Second, hotels keep paying 15–17% commission on **guests who are already loyal** and would book direct.

**Clawback is an autonomous enterprise agent that audits the hotel's entire OTA relationship.** It runs three phases in one tool-use loop: a daily **Sentinel** that catches unmarked PMS events before they get invoiced (with the contractual countdown on screen), a monthly **Auditor** that reconciles every invoice line against the PMS, the extranet log and each OTA's own contract, and a **Win-Back** engine that identifies repeat OTA guests via RFM and drafts personalized direct-booking offers under the hotel's written benefit ladder.

Every decision is grounded in documents and cites its evidence (contract clause, PMS record, extranet log entry, invoice line) with clickable citations. Decisions carry confidence scores with reasons — including when the agent **declines to act**: two reservations with the identical symptom (booked 7 nights, stayed 5) get opposite verdicts, because commission follows the money the hotel actually kept. And the manager can correct the agent in chat: corrections persist as **learned rules** that recompute totals instantly and apply to every future audit.

**How it meets the track:** core reasoning runs on **Vultr Serverless Inference** (Kimi-K2.6 driving a 13-tool agent loop), and **every document retrieval goes through VultronRetriever** (rerank), whose relevance scores are visible live in the agent's reasoning feed. Deployed on a Vultr VPS. The agent plans, retrieves reactively (a finding triggers the next retrieval), calls tools, makes cited decisions, and outputs artifacts a real hotel team can use on Monday: dispute memos filed within the window, approved guest messages, and an executive margin report.

The problem comes from GROVA's real consulting engagement with an independent hotel in Oaxaca, México (60%+ OTA dependency). The product was built entirely during the event.

## Links
- **Live demo:** http://108.61.209.3
- **Repo:** https://github.com/Breistar/clawback
- **Video:** https://youtu.be/KXCn8HMAAfI

## Team
Team GROVA (remote — Oaxaca, México / Nicaragua / Argentina): Breistar Sánchez (product), Ariadna Ramírez (frontend), Nelson Ramos (backend/deploy), Rodolfo Navarro (demo & submission).

## Tech notes (if the form asks for architecture)
React+Vite+TS frontend · Node/Express backend with SSE streaming the agent's reasoning live ("glass brain") · SQLite (reservations, invoices, extranet log, guest history, learned rules) · Agent: OpenAI-compatible tool-use loop on Vultr Serverless Inference — Kimi-K2.6 for reasoning, VultronRetrieverPrime via /v1/rerank inside every document tool · self-healing orchestration (each sub-task verifies its persisted finding and re-runs on endpoint stalls) · Docker single-container deploy on Vultr VPS.
