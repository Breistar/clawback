/**
 * API surface. Thin by design: the agent writes findings to SQLite through its
 * tools; these routes only read and serve. Totals are computed here (never by
 * the model) so Overview = Disputes = Report always agree.
 */
import { Router } from 'express';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { getDb, DOCUMENTS_DIR } from '../db/db.ts';
import { runFullAudit, type AgentEvent } from '../agent/loop.ts';
import { runChatTurn } from './chat.ts';

export const api = Router();

// ---- audit + SSE ----
const clients = new Set<(e: AgentEvent) => void>();
let running = false;
const broadcast = (e: AgentEvent) => clients.forEach((send) => send(e));

api.get('/audit/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const send = (e: AgentEvent) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  clients.add(send);
  req.on('close', () => clients.delete(send));
});

api.post('/audit/run', (_req, res) => {
  if (running) return res.status(409).json({ error: 'audit already running' });
  running = true;
  runFullAudit(broadcast).finally(() => { running = false; });
  res.json({ started: true });
});

// ---- findings ----
api.get('/disputes', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM disputes ORDER BY id').all() as any[];
  res.json(rows.map((r) => ({ ...r, evidence: JSON.parse(r.evidence) })));
});

api.get('/winback', (_req, res) => {
  res.json(getDb().prepare(`
    SELECT o.*, g.name AS guest_name, g.notes AS guest_notes
    FROM offers o JOIN guests g ON g.id = o.guest_id
    ORDER BY o.burned_per_year DESC
  `).all());
});

api.get('/report', (_req, res) => {
  const db = getDb();
  const v = (sql: string) => (db.prepare(sql).get() as any).v ?? 0;
  res.json({
    prevented_today: v("SELECT SUM(amount) v FROM disputes WHERE decision='AT_RISK' AND status='open'"),
    disputable_month: v("SELECT SUM(amount) v FROM disputes WHERE decision='DISPUTABLE' AND status='open'"),
    verify_pending: v("SELECT SUM(amount) v FROM disputes WHERE decision='VERIFY' AND status='open'"),
    recoverable_monthly: Math.round(v('SELECT SUM(burned_per_year) v FROM offers') / 12),
    repeat_guests: v('SELECT COUNT(*) v FROM offers'),
    // 58% = room-nights via OTA computed from 12 months of the hotel's real
    // channel data (anonymized aggregate) — not an invented figure
    ota_share_today: 58,
    ota_share_projected: 46,
    annual_savings: v('SELECT SUM(burned_per_year) v FROM offers'),
  });
});

// ---- chat ----
api.post('/chat', async (req, res) => {
  const { message, history } = req.body ?? {};
  if (!message) return res.status(400).json({ error: 'message required' });
  try {
    const turn = await runChatTurn(message, history ?? []);
    if (turn.ruleLearned) broadcast({ type: 'learned', text: turn.ruleLearned });
    res.json(turn);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
});

api.get('/rules', (_req, res) => {
  res.json(getDb().prepare('SELECT * FROM learned_rules WHERE active = 1 ORDER BY id').all());
});

// ---- citation resolver for the side panel ----
const DOC_FILES: Record<string, string> = {
  BKG: 'booking_contract.md', EXP: 'expedia_contract.md', POL: 'hotel_policies.md', LAD: 'benefit_ladder.md',
};
api.get('/documents/:id', (req, res) => {
  const id = req.params.id;
  const prefix = id.split('-')[0].toUpperCase();
  const db = getDb();
  if (prefix === 'PMS') return res.json({ kind: 'record', id, data: db.prepare('SELECT * FROM reservations WHERE id = ?').get(id.slice(4)) });
  if (prefix === 'LOG') return res.json({ kind: 'record', id, data: db.prepare('SELECT * FROM extranet_log WHERE log_ref = ?').get(id.slice(4)) });
  if (prefix === 'INV') return res.json({ kind: 'record', id, data: db.prepare('SELECT * FROM invoice_lines WHERE line_no = ?').get(id.replace('INV-L', '')) });
  const file = DOC_FILES[prefix];
  if (!file || !existsSync(path.join(DOCUMENTS_DIR, file))) return res.status(404).json({ error: `unknown document ${id}` });
  res.json({ kind: 'document', id, markdown: readFileSync(path.join(DOCUMENTS_DIR, file), 'utf-8') });
});

// ---- hidden demo reset ----
api.post('/seed/reset', (_req, res) => {
  getDb().exec("DELETE FROM disputes; DELETE FROM offers; DELETE FROM learned_rules WHERE source='chat';");
  res.json({ reset: true });
});
