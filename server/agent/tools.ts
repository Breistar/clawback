/**
 * The agent's 13 tools. They are the integration boundary: read SQLite +
 * markdown documents, write findings back. Document tools run their retrieval
 * through VultronRetriever (rerank) so every retrieval step is model-powered.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type OpenAI from 'openai';
import { getDb, DOCUMENTS_DIR } from '../db/db.ts';
import { rerank, hasVultrKey } from './vultr.ts';

const readDoc = (file: string) => readFileSync(path.join(DOCUMENTS_DIR, file), 'utf-8');
const splitSections = (md: string) => md.split(/\n(?=## )/);

/** Retrieval step: VultronRetriever ranks the document's sections against the query. */
async function retrieveSection(file: string, query: string) {
  const sections = splitSections(readDoc(file));
  if (!hasVultrKey()) {
    // offline fallback: plain heading match, keeps frontend work unblocked
    const hit = sections.find((s) => s.split('\n')[0].toLowerCase().includes(query.toLowerCase()));
    return { source: file, retriever: 'offline-heading-match', score: null, section: hit ?? md_first(sections) };
  }
  const hits = await rerank(query, sections);
  const top = hits[0];
  return {
    source: file,
    retriever: 'VultronRetrieverPrime (Vultr rerank)',
    score: +top.score.toFixed(2),
    section: top.text,
  };
}
const md_first = (sections: string[]) => sections[0];

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]): OpenAI.Chat.Completions.ChatCompletionTool => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
});

export const toolDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  fn('sentinel_sweep', "Yesterday's PMS events (no-shows, early departures) with no mark yet on the OTA extranet.", {}, []),
  fn('get_invoice_lines', 'All invoice lines of the month for one OTA.', { ota: { type: 'string', enum: ['booking', 'expedia'] } }, ['ota']),
  fn('get_reservation', 'PMS record: nights booked/stayed, rate plan FLEX/NR, amounts charged/refunded, status. Cite PMS-<id>.', { id: { type: 'integer' } }, ['id']),
  fn('get_extranet_log', 'Extranet marking history for a reservation. Cite LOG-<log_ref>.', { reservation_id: { type: 'integer' } }, ['reservation_id']),
  fn('get_contract_clause', "Retrieve the most relevant clause of the OTA's contract for a topic (VultronRetriever-ranked). topic examples: 'shortened stays refund', 'no-show marking window', 'invoice dispute window'. Cite BKG-§x / EXP-§x.", { ota: { type: 'string', enum: ['booking', 'expedia'] }, topic: { type: 'string' } }, ['ota', 'topic']),
  fn('get_policy', "Retrieve the most relevant hotel-policy or benefit-ladder section for a topic (VultronRetriever-ranked). Cite POL-xx / LAD-xx.", { topic: { type: 'string' } }, ['topic']),
  fn('commission_calculator', 'Deterministic math: base × pct.', { base: { type: 'number' }, pct: { type: 'number', description: '17 means 17%' } }, ['base', 'pct']),
  fn('run_rfm', 'R/F/M scores + segment over the 18-month guest history; repeat guests still booking via OTA with burned commission.', {}, []),
  fn('check_availability', 'Room availability for upgrade offers.', { room_type: { type: 'string' }, period: { type: 'string' } }, ['room_type', 'period']),
  fn('draft_dispute_memo', 'Persist a finding + memo. Required for EVERY audit decision.', {
    reservation_id: { type: 'integer' },
    ota: { type: 'string', enum: ['booking', 'expedia'] },
    finding: { type: 'string' },
    decision: { type: 'string', enum: ['DISPUTABLE', 'NOT_DISPUTABLE', 'VERIFY', 'AT_RISK'] },
    confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
    confidence_reason: { type: 'string' },
    amount: { type: 'number' },
    evidence: { type: 'array', items: { type: 'string' } },
    memo_md: { type: 'string' },
    window_deadline: { type: 'string' },
  }, ['reservation_id', 'ota', 'finding', 'decision', 'confidence', 'confidence_reason', 'amount', 'evidence']),
  fn('draft_guest_message', 'Persist a win-back offer preview for a guest.', {
    guest_id: { type: 'integer' },
    segment: { type: 'string', enum: ['CHAMPION', 'LOYAL', 'PROMISING', 'DORMANT'] },
    r_days: { type: 'integer' },
    f_stays: { type: 'integer' },
    m_avg: { type: 'number' },
    channel: { type: 'string' },
    burned_per_visit: { type: 'number' },
    burned_per_year: { type: 'number' },
    offer_md: { type: 'string' },
  }, ['guest_id', 'segment', 'r_days', 'f_stays', 'm_avg', 'channel', 'burned_per_visit', 'burned_per_year', 'offer_md']),
  fn('get_learned_rules', 'Active learned rules / exemptions. Call before deciding.', {}, []),
  fn('save_learned_rule', 'Persist a manager correction as a rule for all future audits.', { rule_text: { type: 'string' }, scope: { type: 'string', enum: ['dispute', 'winback'] } }, ['rule_text']),
];

export async function handleTool(name: string, input: any): Promise<unknown> {
  const db = getDb();
  switch (name) {
    case 'sentinel_sweep':
      return db.prepare(`
        SELECT r.id, r.ota, r.guest_name, r.checkin, r.nights_booked, r.rate_plan, r.nightly_rate, r.status
        FROM reservations r
        LEFT JOIN extranet_log l ON l.reservation_id = r.id
        WHERE r.status IN ('no_show','early_departure') AND l.id IS NULL
          AND date(r.checkin) >= date('now', '-3 days')
      `).all();

    case 'get_invoice_lines':
      return db.prepare('SELECT * FROM invoice_lines WHERE ota = ? ORDER BY line_no').all(input.ota);

    case 'get_reservation': {
      const id = input.id ?? input.reservation_id; // models use either name
      return db.prepare('SELECT * FROM reservations WHERE id = ?').get(id) ?? { error: `no PMS record ${id} — use an id that appeared in a previous tool result` };
    }

    case 'get_extranet_log':
      return db.prepare('SELECT * FROM extranet_log WHERE reservation_id = ?').all(input.reservation_id);

    case 'get_contract_clause':
      if (!input?.topic) return { error: 'the topic argument is required — describe what clause you need, like the no-show marking window' };
      return retrieveSection(input.ota === 'booking' ? 'booking_contract.md' : 'expedia_contract.md', String(input.topic));

    case 'get_policy': {
      if (!input?.topic) return { error: 'the topic argument is required — describe which policy you need, like rate plans' };
      const t = String(input.topic).toLowerCase();
      const file = /lad|ladder|segment|offer|win/.test(t) ? 'benefit_ladder.md' : 'hotel_policies.md';
      return retrieveSection(file, input.topic);
    }

    case 'commission_calculator':
      return { base: input.base, pct: input.pct, commission: +(input.base * input.pct / 100).toFixed(2) };

    case 'run_rfm': {
      const rows = db.prepare(`
        SELECT g.id, g.name, g.notes,
               COUNT(*) AS f_stays,
               CAST(julianday('now') - julianday(MAX(s.checkin)) AS INTEGER) AS r_days,
               ROUND(AVG(s.room_revenue + s.restaurant_spend + s.tours_spend)) AS m_avg,
               ROUND(AVG(s.room_revenue)) AS avg_room_revenue,
               ROUND(AVG(s.restaurant_spend)) AS avg_restaurant,
               ROUND(AVG(s.tours_spend)) AS avg_tours,
               (SELECT channel FROM stays x WHERE x.guest_id = g.id GROUP BY channel ORDER BY COUNT(*) DESC LIMIT 1) AS channel
        FROM guests g JOIN stays s ON s.guest_id = g.id
        GROUP BY g.id HAVING f_stays >= 2 ORDER BY m_avg DESC
      `).all() as any[];
      return rows
        .filter((r) => r.channel !== 'direct')
        .map((r) => {
          const pct = r.channel === 'booking' ? 17 : 15;
          const burned = Math.round(r.avg_room_revenue * pct / 100);
          const perYear = Math.round(burned * (r.f_stays / 1.5));
          // segment classification is deterministic (LAD-01) — the model applies
          // the ladder to it, it does not re-derive it
          const segment =
            r.f_stays >= 4 && r.r_days <= 60 ? 'CHAMPION'
            : r.r_days > 180 && r.m_avg >= 15000 ? 'DORMANT'
            : r.f_stays >= 3 && r.r_days <= 180 ? 'LOYAL'
            : 'PROMISING';
          return { ...r, commission_pct: pct, burned_per_visit: burned, burned_per_year: perYear, segment_per_LAD01: segment };
        });
    }

    case 'check_availability':
      return { room_type: input.room_type, period: input.period, available: !String(input.period ?? '').includes('12-') };

    case 'draft_dispute_memo':
      db.prepare(`INSERT INTO disputes (reservation_id, ota, finding, decision, confidence, confidence_reason, amount, evidence, memo_md, window_deadline)
                  VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(input.reservation_id, input.ota, input.finding, input.decision, input.confidence, input.confidence_reason,
          input.amount, JSON.stringify(input.evidence), input.memo_md ?? null, input.window_deadline ?? null);
      return { saved: true };

    case 'draft_guest_message':
      db.prepare(`INSERT INTO offers (guest_id, segment, r_days, f_stays, m_avg, channel, burned_per_visit, burned_per_year, offer_md)
                  VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(input.guest_id, input.segment, input.r_days, input.f_stays, input.m_avg, input.channel,
          input.burned_per_visit, input.burned_per_year, input.offer_md);
      return { saved: true };

    case 'get_learned_rules':
      return db.prepare('SELECT id, rule_text, scope, source FROM learned_rules WHERE active = 1').all();

    case 'save_learned_rule': {
      const r = db.prepare('INSERT INTO learned_rules (rule_text, scope, source) VALUES (?,?,?)').run(input.rule_text, input.scope ?? 'dispute', 'chat');
      // If the rule names reservation ids, exempt their open disputes right away
      // so every total recomputes (report sums only status='open').
      const ids = [...new Set(String(input.rule_text).match(/\b\d{4}\b/g) ?? [])];
      let exempted = 0;
      for (const id of ids) {
        exempted += db.prepare("UPDATE disputes SET status='exempted' WHERE reservation_id = ? AND status='open'").run(id).changes;
      }
      return { saved: true, id: r.lastInsertRowid, rule_text: input.rule_text, disputes_exempted: exempted };
    }

    default:
      return { error: `unknown tool ${name}` };
  }
}
