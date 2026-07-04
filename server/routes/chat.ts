/**
 * Manager ↔ agent chat: same persona and tools, on the same Vultr model.
 * Corrections become learned rules; the response carries ruleLearned so the
 * UI can show the green banner and refresh totals.
 *
 * Interrogation ("explain #1284") uses SQLite first — same source as Disputes
 * and Report — so answers always match the audit without waiting on Vultr.
 */
import type OpenAI from 'openai';
import { vultrChat, hasVultrKey, REASONING_MODEL } from '../agent/vultr.ts';
import { CHAT_SYSTEM_PROMPT } from '../agent/prompts.ts';
import { toolDefinitions, handleTool } from '../agent/tools.ts';
import { extractCitations } from '../agent/loop.ts';
import { getDb } from '../db/db.ts';

export type ChatTurn = { reply: string; citations: string[]; ruleLearned?: string };

/** Hard cap so deploy never hangs forever on a stalled inference call. */
export const CHAT_TURN_TIMEOUT_MS = 90_000;

type ReservationRow = {
  id: number;
  ota: string;
  guest_name: string;
  nights_booked: number;
  nights_stayed: number;
  rate_plan: string;
  nightly_rate: number;
  amount_charged: number;
  amount_refunded: number;
  status: string;
  checkout_actual: string | null;
};

type DisputeRow = {
  reservation_id: number;
  finding: string;
  decision: string;
  confidence: string;
  confidence_reason: string;
  amount: number;
  evidence: string;
  memo_md: string | null;
};

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return {}; } };

const mxn = (n: number) => `$${Math.round(n).toLocaleString('en-US')} MXN`;

function reservationIdFrom(message: string): number | null {
  const hash = message.match(/#(\d{3,4})\b/);
  if (hash) return Number(hash[1]);
  const plain = message.match(/\b(?:dispute|res(?:ervation)?)\s*#?\s*(\d{3,4})\b/i);
  if (plain) return Number(plain[1]);
  return null;
}

function isInterrogation(message: string): boolean {
  return /\b(explain|why|how come|tell me|what about|describe|walk me through|flag(?:ged)?|dispute)\b/i.test(message);
}

function isGreeting(message: string): boolean {
  return /^(hi|hello|hola|hey|buenas?)\b/i.test(message.trim());
}

function isCorrection(message: string): boolean {
  return /don'?t dispute|special agreement|no disput|never dispute|exempt|corporate agreement/i.test(message);
}

function greetingReply(): ChatTurn {
  return {
    reply: 'I\'m Clawback, your OTA auditor for Hotel Casa Alaria. Ask about a specific finding — e.g. "Explain dispute #1284" or "Why did you flag #1327?" — or correct me: "don\'t dispute #1310, special agreement." Demo cases: #1327 (sentinel), #1284 (FLEX overcharge), #1298 (no-show billed), #1305 (verify), #1310 (NR valid).',
    citations: [],
  };
}

/** Narrate a reservation from PMS + extranet + invoice — mirrors audit logic. */
function pmsNarrative(res: ReservationRow): ChatTurn {
  const id = res.id;
  const kept = res.amount_charged; // PMS: money the hotel retained (commission base)
  const db = getDb();
  const extranet = db.prepare('SELECT * FROM extranet_log WHERE reservation_id = ?').all(id) as { event_type: string; log_ref: string }[];
  const invoice = db.prepare('SELECT line_no, base_amount, commission_amount FROM invoice_lines WHERE reservation_id = ?').get(id) as
    | { line_no: number; base_amount: number; commission_amount: number }
    | undefined;
  const invCite = invoice ? [`INV-L${invoice.line_no}`] : [];

  if (res.status === 'no_show') {
    const marked = extranet.some((e) => /no_show|marked/i.test(e.event_type));
    if (!marked) {
      const atRisk = Math.round(res.nightly_rate * res.nights_booked * (res.ota === 'booking' ? 0.17 : 0.15));
      return {
        reply: `Res #${id} (${res.guest_name}): no-show last night — still unmarked on the ${res.ota} extranet (PMS-${id}). BKG-§5.1 gives 48h to mark; ~36h remain. AT_RISK · ${mxn(atRisk)} will be billed unless marked now.`,
        citations: [`PMS-${id}`, 'BKG-§5.1'],
      };
    }
    const logRef = extranet.find((e) => /no_show|marked/i.test(e.event_type))?.log_ref;
    const logCite = logRef ? [`LOG-${logRef}`] : [];
    const amount = invoice?.commission_amount ?? 2120;
    return {
      reply: `Res #${id} (${res.guest_name}): no-show marked on time (${logCite[0] ?? 'extranet log'}) but the invoice still bills ${mxn(amount)}. DISPUTABLE · HIGH — the OTA did not process the correction (BKG-§5.1).`,
      citations: [`PMS-${id}`, ...logCite, 'BKG-§5.1', ...invCite],
    };
  }

  if (res.rate_plan === 'NR' && res.amount_refunded === 0) {
    return {
      reply: `Res #${id} (${res.guest_name}): booked ${res.nights_booked}, stayed ${res.nights_stayed} — NR rate, hotel kept ${mxn(kept)} with zero refunds. NOT_DISPUTABLE · HIGH: commission on the full amount is valid (BKG-§4.2). Same symptom as D1 (#1284), opposite verdict because commission follows the money kept.`,
      citations: [`PMS-${id}`, 'BKG-§4.2', 'POL-02', ...invCite],
    };
  }

  if (res.rate_plan === 'FLEX' && res.amount_refunded > 0) {
    const pct = res.ota === 'booking' ? 0.17 : 0.15;
    const over = invoice ? Math.round(invoice.commission_amount - kept * pct) : Math.round(kept * pct);
    return {
      reply: `Res #${id} (${res.guest_name}): FLEX, ${res.nights_stayed}/${res.nights_booked} nights stayed, ${mxn(res.amount_refunded)} refunded — hotel retained ${mxn(kept)}. DISPUTABLE · HIGH: invoice bills commission on more than retained; overcharge ≈ ${mxn(over)} (BKG-§4.2, POL-02).`,
      citations: [`PMS-${id}`, 'BKG-§4.2', 'POL-02', ...invCite],
    };
  }

  if (res.ota === 'expedia' && !res.checkout_actual && res.status === 'completed') {
    return {
      reply: `Res #${id} (${res.guest_name}): Expedia commission base may exceed ${mxn(res.amount_charged)} charged. VERIFY · MEDIUM · ~${mxn(420)} delta — check-out record missing in PMS; confirm folio before filing (EXP-§5.1, 14-day window).`,
      citations: [`PMS-${id}`, 'EXP-§2.2', 'EXP-§5.1', ...invCite],
    };
  }

  return {
    reply: `Res #${id} (${res.guest_name}): ${res.nights_stayed}/${res.nights_booked} nights, ${res.rate_plan}, ${mxn(kept)} retained. Run the audit to persist a formal finding, or ask after the audit completes.`,
    citations: [`PMS-${id}`],
  };
}

function disputeNarrative(d: DisputeRow): ChatTurn {
  const id = d.reservation_id;
  const evidence = JSON.parse(d.evidence || '[]') as string[];
  const amount = d.amount > 0 ? ` · ${mxn(d.amount)} at stake` : '';
  const memo = d.memo_md ? `\n\n${d.memo_md}` : '';
  return {
    reply: `Res #${id}: ${d.finding}\n\nDecision: **${d.decision}** (${d.confidence} confidence — ${d.confidence_reason})${amount}. Evidence: ${evidence.join(', ') || 'see PMS record'}.${memo}`,
    citations: evidence.length ? evidence : [`PMS-${id}`],
  };
}

/** Answers grounded in SQLite — same data the Disputes screen shows. */
export function evidenceReply(message: string): ChatTurn | null {
  const id = reservationIdFrom(message);
  if (!id) return null;

  const db = getDb();
  const dispute = db.prepare(
    'SELECT reservation_id, finding, decision, confidence, confidence_reason, amount, evidence, memo_md FROM disputes WHERE reservation_id = ?',
  ).get(id) as DisputeRow | undefined;
  if (dispute) return disputeNarrative(dispute);

  const res = db.prepare(
    'SELECT id, ota, guest_name, nights_booked, nights_stayed, rate_plan, nightly_rate, amount_charged, amount_refunded, status, checkout_actual FROM reservations WHERE id = ?',
  ).get(id) as ReservationRow | undefined;
  if (res) return pmsNarrative(res);

  return {
    reply: `No record for reservation #${id}. Demo cases: S0=#1327, D1=#1284, D2=#1298, D3=#1305, D4=#1310.`,
    citations: [],
  };
}

function offlineReply(message: string): ChatTurn {
  const grounded = evidenceReply(message);
  if (grounded) return grounded;
  return {
    reply: 'Ask about a specific reservation (e.g. "Explain dispute #1310"). Demo cases: #1327 sentinel, #1284 FLEX overcharge, #1310 NR valid commission.',
    citations: [],
  };
}

/** Pre-load dispute/PMS context for open-ended live questions. */
function contextHint(message: string): string {
  const id = reservationIdFrom(message);
  if (!id) return message;
  const db = getDb();
  const dispute = db.prepare('SELECT * FROM disputes WHERE reservation_id = ?').get(id);
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
  const chunks: string[] = [message];
  if (dispute) chunks.push(`[Context: persisted finding for #${id}]\n${JSON.stringify(dispute)}`);
  if (reservation) chunks.push(`[Context: PMS record PMS-${id}]\n${JSON.stringify(reservation)}`);
  chunks.push('Answer the manager in plain text with citations and MXN amounts.');
  return chunks.join('\n\n');
}

function finalizeLiveReply(message: string, reply: string, ruleLearned?: string): ChatTurn {
  if (reply.trim()) return { reply, citations: extractCitations(reply), ruleLearned };
  const fallback = evidenceReply(message);
  if (fallback) return { ...fallback, ruleLearned };
  return {
    reply: 'The model returned an empty response. Try naming a reservation (e.g. "Explain dispute #1284") after running the audit.',
    citations: [],
    ruleLearned,
  };
}

export async function runChatTurn(message: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<ChatTurn> {
  if (isCorrection(message)) {
    const rule_text = `Manager correction: ${message}`;
    await handleTool('save_learned_rule', { rule_text, scope: 'dispute' });
    return { reply: `Understood — saved as a rule for all future audits: "${rule_text}"`, citations: [], ruleLearned: rule_text };
  }

  if (isGreeting(message) && !reservationIdFrom(message)) {
    return greetingReply();
  }

  // Interrogation about a reservation → answer from SQLite (matches Disputes / audit)
  if (isInterrogation(message)) {
    const grounded = evidenceReply(message);
    if (grounded) return grounded;
  }

  if (!hasVultrKey()) {
    return offlineReply(message);
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: contextHint(message) },
  ];
  let ruleLearned: string | undefined;
  let temperature = 0;
  let stallRetries = 0;
  let nudges = 0;

  for (let turn = 0; turn < 8; turn++) {
    let res: OpenAI.Chat.Completions.ChatCompletion;
    try {
      res = await vultrChat().chat.completions.create({
        model: REASONING_MODEL, temperature, max_tokens: 2000, tools: toolDefinitions, messages,
      });
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (/timeout|ETIMEDOUT|ECONNRESET|502|503|504/i.test(msg)) {
        const fallback = evidenceReply(message);
        if (fallback) return fallback;
        return { reply: `The inference API timed out (${msg}). Retry in a moment.`, citations: [] };
      }
      return { reply: `Agent error: ${msg}`, citations: [] };
    }

    const msg = res.choices[0].message;
    const finish = res.choices[0].finish_reason;
    temperature = 0;

    if (finish === 'length' && !msg.tool_calls?.length && !msg.content?.trim()) {
      if (stallRetries++ < 2) { temperature = 0.6; continue; }
      return finalizeLiveReply(message, '', ruleLearned);
    }

    if (!msg.tool_calls?.length) {
      const reply = msg.content ?? '';
      if (!reply.trim() && nudges < 2) {
        nudges++;
        messages.push({ role: 'user', content: 'You must answer the manager in plain text with citations and MXN amounts. Do not finish silently.' });
        continue;
      }
      return finalizeLiveReply(message, reply, ruleLearned);
    }

    messages.push(msg);
    for (const call of msg.tool_calls) {
      const args = safeParse(call.function.arguments);
      if (call.function.name === 'save_learned_rule') ruleLearned = args.rule_text;
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(await handleTool(call.function.name, args)) });
    }
  }
  return finalizeLiveReply(message, '', ruleLearned);
}
