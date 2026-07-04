/**
 * The agent loop — Qwen3.6-27B on Vultr Serverless Inference, OpenAI tool-use
 * protocol, three phases. Every step streams a glass-brain event over SSE.
 * Without VULTR_INFERENCE_API_KEY it falls back to a scripted replay so
 * frontend work never blocks on the models.
 */
import type OpenAI from 'openai';
import { vultrChat, hasVultrKey, REASONING_MODEL } from './vultr.ts';
import { SYSTEM_PROMPT } from './prompts.ts';
import { toolDefinitions, handleTool } from './tools.ts';
import { scriptedReplay } from './fakeFeed.ts';
import { getDb } from '../db/db.ts';

export type AgentEvent = {
  type: 'plan' | 'retrieve' | 'finding' | 'tool' | 'decision' | 'learned' | 'phase' | 'done' | 'error';
  text: string;
  citations?: string[];
  amount?: number;
  meta?: Record<string, unknown>;
};
export type Emit = (e: AgentEvent) => void;

// Each phase runs as small focused sub-tasks: the endpoint clamps completions
// at ~2,048 tokens, so one-big-task phases died writing long analyses. Small
// contexts finish; the reactive retrieval chain happens inside each sub-task.
const auditOne = (id: number) => `You are in the AUDITOR phase, auditing invoice month 2026-06. Audit reservation ${id} now: pull its PMS record with get_reservation, check its extranet log, find its invoice line (get_invoice_lines for its OTA), retrieve the contract clause and hotel policy the evidence demands, recalculate with commission_calculator, then decide DISPUTABLE, NOT_DISPUTABLE or VERIFY and persist the decision with draft_dispute_memo citing the ids you used. The disputable amount is the commission billed on the invoice line MINUS the correct commission computed on amount_charged (the money the hotel kept) — use commission_calculator on amount_charged to get the correct figure. A missing check-out record forces VERIFY with MEDIUM confidence ONLY when the guest actually stayed (status completed or early_departure) — for a no_show a null check-out is expected and does not weaken the evidence. Be brief: act through tools, not prose.`;

const PHASES: { name: string; tasks: string[] }[] = [
  {
    name: 'SENTINEL',
    tasks: [
      `Phase SENTINEL. Call sentinel_sweep. For each unmarked event: retrieve that OTA's marking-window clause with get_contract_clause, compute the commission at risk with commission_calculator, and persist an AT_RISK finding with draft_dispute_memo including the window deadline as ISO datetime. Every unmarked event needs its memo. Finish with a one-line summary. Be brief: act through tools, not prose.`,
    ],
  },
  {
    name: 'AUDITOR',
    tasks: [
      `You are in the AUDITOR phase. Call get_learned_rules and state in one line how many exemptions are on file, then audit reservation 1284: ${auditOne(1284).split('now: ')[1]}`,
      auditOne(1298),
      auditOne(1305),
      auditOne(1310),
    ],
  },
  {
    name: 'WIN-BACK',
    tasks: [
      `Phase WIN-BACK. Call run_rfm. Take the CHAMPION guest (per the segment_per_LAD01 field — do not reclassify). Read the offer rules with get_policy on the benefit ladder, call check_availability for the suite upgrade, then persist ONE personalized offer with draft_guest_message: segment from segment_per_LAD01, cross-sell matched to the guest's history and notes, post-stay review invite, never a discount for a champion. Be brief.`,
      `Phase WIN-BACK continues. Call run_rfm. Take the top LOYAL guest (per segment_per_LAD01 — do not reclassify). Read the offer rules with get_policy on the benefit ladder, then persist ONE personalized offer with draft_guest_message: segment from segment_per_LAD01, direct rate + welcome drink, cross-sell matched to the guest's history and notes, review invite. Be brief.`,
    ],
  },
];

export async function runFullAudit(emit: Emit): Promise<void> {
  // fresh run replaces previous findings; learned rules survive on purpose
  getDb().exec('DELETE FROM disputes; DELETE FROM offers;');

  if (!hasVultrKey()) {
    await scriptedReplay(emit);
    return;
  }

  try {
    for (const phase of PHASES) {
      emit({ type: 'phase', text: phase.name });
      for (const task of phase.tasks) await runPhase(task, emit);
    }
    emit({ type: 'done', text: summaryLine() });
  } catch (err: any) {
    emit({ type: 'error', text: `agent error: ${err?.message ?? err}` });
  }
}

async function runPhase(task: string, emit: Emit): Promise<void> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: task },
  ];

  let nudges = 0;
  let stallRetries = 0;
  let temperature = 0;
  for (let turn = 0; turn < 30; turn++) {
    // Hard-won lessons from live runs: the endpoint clamps completions at
    // ~2,048 tokens; tool_choice forcing degrades models into empty-arg loops;
    // and the model sometimes burns the whole budget on hidden reasoning
    // (finish=length, zero visible output) — retried with temperature to
    // escape that attractor.
    const res = await vultrChat().chat.completions.create({
      model: REASONING_MODEL,
      temperature,
      max_tokens: 2000,
      tools: toolDefinitions,
      messages,
    });

    const msg = res.choices[0].message;
    const finish = res.choices[0].finish_reason;
    console.log(`[loop] finish=${finish} tools=${msg.tool_calls?.length ?? 0} content=${(msg.content ?? '').length}ch temp=${temperature}`);
    temperature = 0;

    if (finish === 'length' && !msg.tool_calls?.length && !msg.content?.trim()) {
      // hidden-reasoning stall: whole budget burned with nothing visible.
      if (stallRetries++ < 3) {
        temperature = 0.6; // shake it out of the thinking attractor
        continue;
      }
      return;
    }

    if (msg.content?.trim() && !msg.content.includes('<tool_call>')) {
      emit({ type: classify(msg.content), text: msg.content.trim(), citations: extractCitations(msg.content) });
    }

    if (!msg.tool_calls?.length) {
      // empty answer with no tools = the model stalled; push it to finish the job
      if (!msg.content?.trim() && nudges < 2) {
        nudges++;
        messages.push({ role: 'user', content: 'You produced no output. Continue the phase: call the required tools and persist every decision before finishing.' });
        continue;
      }
      return;
    }

    messages.push(msg);
    for (const call of msg.tool_calls) {
      const args = safeParse(call.function.arguments);
      emit({ type: eventTypeFor(call.function.name), text: describe(call.function.name, args), meta: { tool: call.function.name, input: args } });
      // a failing tool must never kill the run — return the error to the model so it retries
      let result: unknown;
      try {
        result = await handleTool(call.function.name, args);
      } catch (err: any) {
        result = { error: `${call.function.name} failed: ${err?.message ?? err}. Fix the arguments and retry.` };
      }
      if (call.function.name === 'get_contract_clause' || call.function.name === 'get_policy') {
        const r = result as any;
        if (r?.score != null) {
          emit({ type: 'retrieve', text: `VultronRetriever ranked the top section · score ${r.score}`, meta: { source: r.source } });
        }
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
}

function summaryLine(): string {
  const db = getDb();
  const s = (sql: string) => (db.prepare(sql).get() as any).v ?? 0;
  const atRisk = s("SELECT SUM(amount) v FROM disputes WHERE decision='AT_RISK'");
  const disputable = s("SELECT SUM(amount) v FROM disputes WHERE decision='DISPUTABLE'");
  const monthly = Math.round(s('SELECT SUM(burned_per_year) v FROM offers') / 12);
  return `Audit complete. At risk today: $${fmt(atRisk)} · Disputable this month: $${fmt(disputable)} · Recoverable monthly (win-back): $${fmt(monthly)} MXN.`;
}
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return {}; } };

function eventTypeFor(tool: string): AgentEvent['type'] {
  if (['get_contract_clause', 'get_policy', 'get_reservation', 'get_extranet_log', 'get_invoice_lines'].includes(tool)) return 'retrieve';
  if (tool === 'save_learned_rule') return 'learned';
  return 'tool';
}

function classify(text: string): AgentEvent['type'] {
  const t = text.toUpperCase();
  if (/(NOT_DISPUTABLE|DISPUTABLE|AT_RISK|VERIFY)/.test(t)) return 'decision';
  if (/(PLAN|I WILL|I'LL|FIRST,)/.test(t)) return 'plan';
  return 'finding';
}

export function extractCitations(text: string): string[] {
  return [...new Set(text.match(/\b(?:BKG-§[\d.]+|EXP-§[\d.]+|PMS-\d+|LOG-\d+|POL-\d+|LAD-\d+|INV-L\d+)\b/g) ?? [])];
}

function describe(tool: string, input: any): string {
  switch (tool) {
    case 'sentinel_sweep': return "Sweeping yesterday's PMS events against the OTA extranets";
    case 'get_invoice_lines': return `Loading the ${input.ota} invoice for the month`;
    case 'get_reservation': return `Pulling PMS record PMS-${input.id ?? input.reservation_id}`;
    case 'get_extranet_log': return `Checking the extranet log of reservation ${input.reservation_id}`;
    case 'get_contract_clause': return `Retrieving ${input.ota} contract → "${input.topic}"`;
    case 'get_policy': return `Retrieving hotel policy → "${input.topic}"`;
    case 'commission_calculator': return `Calculating ${input.base} × ${input.pct}%`;
    case 'run_rfm': return 'Running RFM over the 18-month guest history';
    case 'check_availability': return `Checking availability: ${input.room_type} (${input.period})`;
    case 'draft_dispute_memo': return `Persisting finding — res ${input.reservation_id}: ${input.decision} $${input.amount}`;
    case 'draft_guest_message': return `Persisting win-back offer — guest ${input.guest_id} (${input.segment})`;
    case 'get_learned_rules': return 'Loading learned rules and exemptions';
    case 'save_learned_rule': return `RULE LEARNED: ${input.rule_text}`;
    default: return tool;
  }
}
