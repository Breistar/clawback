/**
 * Scripted replay of the choreographed audit for machines without the Vultr
 * key (frontend work). Persists the same findings the real agent would, so
 * every screen has data.
 */
import type { AgentEvent, Emit } from './loop.ts';
import { handleTool } from './tools.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function scriptedReplay(emit: Emit): Promise<void> {
  const deadline = new Date(Date.now() + 36 * 3600e3).toISOString();

  const steps: (AgentEvent & { persist?: () => Promise<unknown> })[] = [
    { type: 'phase', text: 'SENTINEL' },
    { type: 'plan', text: "Plan: sweep yesterday's PMS events against each OTA extranet. 1 exemption on file (Corporativo Mixteca corporate agreement)." },
    { type: 'tool', text: "Sweeping yesterday's PMS events against the OTA extranets" },
    { type: 'finding', text: 'Res #1327 (J. Fernández) no-showed last night — still unmarked on the Booking extranet.', citations: ['PMS-1327'] },
    { type: 'retrieve', text: 'Retrieving booking contract → "no-show marking window"', citations: ['BKG-§5.1'] },
    {
      type: 'decision', text: 'AT_RISK · $1,850 MXN will be billed unless marked — BKG-§5.1 gives 48h, 36h remain. Mark the no-show now.', citations: ['PMS-1327', 'BKG-§5.1'], amount: 1850,
      persist: () => handleTool('draft_dispute_memo', {
        reservation_id: 1327, ota: 'booking', finding: 'No-show not yet marked on the Booking extranet',
        decision: 'AT_RISK', confidence: 'HIGH', confidence_reason: 'PMS no-show + empty extranet log',
        amount: 1850, evidence: ['PMS-1327', 'BKG-§5.1'], window_deadline: deadline,
        memo_md: 'Mark no-show for res #1327 before the 48h window (BKG-§5.1) closes. $1,850 MXN at risk.',
      }),
    },

    { type: 'phase', text: 'AUDITOR' },
    { type: 'plan', text: 'Plan: 30 Booking + 15 Expedia lines vs PMS, extranet and contracts, by materiality. Dispute windows: Booking 7 days, Expedia 14.' },
    { type: 'retrieve', text: 'INV-L11 bills commission on 15,568 for res 1284 — pulling the PMS record.', citations: ['INV-L11', 'PMS-1284'] },
    { type: 'retrieve', text: 'PMS-1284: booked 7, stayed 5, FLEX, 4,448 refunded. Retrieving BKG-§4.2 and POL-02.', citations: ['PMS-1284', 'BKG-§4.2', 'POL-02'] },
    { type: 'tool', text: 'Calculating 11,120 × 17% = 1,890.40 (billed 2,646.56)' },
    {
      type: 'decision', text: 'DISPUTABLE · HIGH · overcharge $756 MXN. FLEX early departure with refund → commission only on the retained 11,120 (BKG-§4.2). Evidence complete.', citations: ['PMS-1284', 'BKG-§4.2', 'POL-02', 'INV-L11'], amount: 756,
      persist: () => handleTool('draft_dispute_memo', {
        reservation_id: 1284, ota: 'booking', finding: 'Early departure (FLEX): commission billed on 7 nights, hotel retained 5',
        decision: 'DISPUTABLE', confidence: 'HIGH', confidence_reason: 'Evidence complete: PMS + BKG-§4.2 + POL-02',
        amount: 756, evidence: ['PMS-1284', 'BKG-§4.2', 'POL-02', 'INV-L11'],
        memo_md: 'Res #1284: 2 unused nights refunded (4,448). Commission due on 11,120 → 1,890.40, billed 2,646.56. Overcharge **$756 MXN**.',
      }),
    },
    { type: 'retrieve', text: 'INV-L23 bills $2,120 on res 1298 but the PMS says no-show — checking the extranet log.', citations: ['INV-L23', 'PMS-1298'] },
    { type: 'retrieve', text: 'LOG-0709: no-show marked 2026-06-12 09:14, inside the 48h window.', citations: ['LOG-0709', 'BKG-§5.1'] },
    {
      type: 'decision', text: 'DISPUTABLE · HIGH · $2,120 MXN. Marked on time, no fee charged — the OTA did not process the correction (BKG-§5.1).', citations: ['PMS-1298', 'LOG-0709', 'BKG-§5.1', 'INV-L23'], amount: 2120,
      persist: () => handleTool('draft_dispute_memo', {
        reservation_id: 1298, ota: 'booking', finding: 'No-show marked on time yet billed in full — correction not processed by the OTA',
        decision: 'DISPUTABLE', confidence: 'HIGH', confidence_reason: 'Extranet log LOG-0709 proves timely marking',
        amount: 2120, evidence: ['PMS-1298', 'LOG-0709', 'BKG-§5.1', 'INV-L23'],
        memo_md: 'Res #1298: no-show marked in window (LOG-0709), no fee retained → zero commission due (BKG-§5.1). Line INV-L23 bills **$2,120 MXN** — full reversal requested.',
      }),
    },
    { type: 'retrieve', text: 'Expedia line 7: commission on 15,200 but PMS-1305 shows 12,400 charged. Check-out record missing.', citations: ['PMS-1305'] },
    {
      type: 'decision', text: 'VERIFY · MEDIUM · delta $420 MXN — the check-out record is missing; confirm the folio before filing (EXP-§5.1, 14-day window).', citations: ['PMS-1305', 'EXP-§2.2', 'EXP-§5.1'], amount: 420,
      persist: () => handleTool('draft_dispute_memo', {
        reservation_id: 1305, ota: 'expedia', finding: 'Commission computed on a higher base than the amount charged to the guest',
        decision: 'VERIFY', confidence: 'MEDIUM', confidence_reason: 'Missing check-out record — verify before sending',
        amount: 420, evidence: ['PMS-1305', 'EXP-§2.2', 'EXP-§5.1'],
        memo_md: 'Res #1305: billed base 15,200 vs 12,400 charged (commission delta $420 MXN). Confirm folio, then file inside the 14-day window.',
      }),
    },
    { type: 'retrieve', text: 'INV-L17 / res 1310: booked 7, stayed 5 — same symptom as res 1284. Pulling the rate plan.', citations: ['INV-L17', 'PMS-1310'] },
    {
      type: 'decision', text: 'NOT_DISPUTABLE · HIGH · rate is NR: the hotel retained the full 13,860, so 17% on it is contractually valid (BKG-§4.2). No action.', citations: ['PMS-1310', 'BKG-§4.2', 'POL-02'], amount: 0,
      persist: () => handleTool('draft_dispute_memo', {
        reservation_id: 1310, ota: 'booking', finding: 'Early departure on NR rate — hotel kept full payment; the charge is valid',
        decision: 'NOT_DISPUTABLE', confidence: 'HIGH', confidence_reason: 'NR, zero refunds → commission follows money retained',
        amount: 0, evidence: ['PMS-1310', 'BKG-§4.2', 'POL-02'],
        memo_md: 'Res #1310 mirrors #1284 (7 booked / 5 stayed) but on NR: 13,860 fully retained. Commission is correct — do not dispute.',
      }),
    },

    { type: 'phase', text: 'WIN-BACK' },
    { type: 'tool', text: 'Running RFM over the 18-month guest history' },
    { type: 'finding', text: 'Repeat OTA guests found. Top burn: Carlos M. — 5 stays, last 21 days ago, ~$16,500/stay, Booking → $2,480 MXN commission per visit.', citations: ['LAD-01'] },
    { type: 'retrieve', text: 'Reading the ladder → LAD-02: champions get upgrade + late checkout, never a discount.', citations: ['LAD-02'] },
    { type: 'tool', text: 'Checking availability: Terrace Suite (next 60 days) → available' },
    {
      type: 'decision', text: 'Offer drafted for Carlos M. (CHAMPION): suite upgrade + late checkout + preferred Alaria Tours pricing + priority table. No discount. Post-stay review invite.', citations: ['LAD-02', 'POL-04'], amount: 2480,
      persist: () => handleTool('draft_guest_message', {
        guest_id: 1, segment: 'CHAMPION', r_days: 21, f_stays: 5, m_avg: 16500, channel: 'booking',
        burned_per_visit: 2480, burned_per_year: 8270,
        offer_md: "Hi Carlos — your Terrace Suite upgrade is waiting. Book direct for your next stay and we'll hold it with late checkout, preferred Alaria Tours pricing for Monte Albán, and your usual table at Alaria Cocina. — Hotel Casa Alaria",
      }),
    },
    {
      type: 'decision', text: 'Offer drafted for Laura R. (LOYAL, Expedia, $1,230/visit burned): direct rate + welcome drink + cooking class at Alaria Cocina, matching her restaurant history.', citations: ['LAD-02', 'POL-05'], amount: 1230,
      persist: () => handleTool('draft_guest_message', {
        guest_id: 2, segment: 'LOYAL', r_days: 75, f_stays: 3, m_avg: 10300, channel: 'expedia',
        burned_per_visit: 1230, burned_per_year: 2460,
        offer_md: "Hi Laura — book your next stay direct and enjoy our direct rate, a welcome drink, and a seat at the chef's cooking class at Alaria Cocina. — Hotel Casa Alaria",
      }),
    },
    { type: 'done', text: 'Audit complete (scripted replay — set VULTR_INFERENCE_API_KEY for the live agent).' },
  ];

  for (const { persist, ...event } of steps) {
    emit(event);
    if (persist) await persist();
    await wait(550);
  }
}
