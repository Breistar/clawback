/**
 * Generates ALL synthetic demo data. The audit choreography (docs/CASOS_DEMO.md)
 * lives here: S0, D1, D2, D3, D4, W, LR — labeled below.
 * Amounts follow the spec targets; tune here if screens need rounder totals.
 * Safe to re-run: wipes and rebuilds the whole database.
 */
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getDb, DB_PATH } from './db.ts';

if (existsSync(DB_PATH)) rmSync(DB_PATH);
const db = getDb();

const MONTH = '2026-06'; // audited month — its invoice "just arrived" in July

// deterministic pseudo-random so every reseed is identical
let seedState = 7;
const rnd = () => {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
};
const between = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const choice = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const dayStr = (d: Date) => d.toISOString().slice(0, 10);
const back = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const guest = db.prepare('INSERT INTO guests (id, name, email, first_seen, notes) VALUES (?,?,?,?,?)');
const stay = db.prepare('INSERT INTO stays (guest_id, checkin, checkout, channel, room_revenue, restaurant_spend, tours_spend) VALUES (?,?,?,?,?,?,?)');
const reservation = db.prepare(`INSERT INTO reservations
  (id, ota, guest_name, checkin, checkout_booked, checkout_actual, nights_booked, nights_stayed, rate_plan, nightly_rate, amount_charged, amount_refunded, status)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const invoiceLine = db.prepare(`INSERT INTO invoice_lines
  (ota, invoice_month, line_no, reservation_id, description, base_amount, commission_pct, commission_amount)
  VALUES (?,?,?,?,?,?,?,?)`);
const extranet = db.prepare('INSERT INTO extranet_log (ota, reservation_id, event_type, marked_at, log_ref) VALUES (?,?,?,?,?)');
const rule = db.prepare('INSERT INTO learned_rules (rule_text, scope, source) VALUES (?,?,?)');

/* ---------- W · win-back guests (repeat guests still arriving via OTA) ---------- */

// Carlos M. — CHAMPION. 5 stays / last 21 days ago / ~$16,500 per stay all-in.
// Room-only revenue 14,588 × 17% ≈ $2,480 commission burned every visit.
guest.run(1, 'Carlos M.', 'carlos.m@example.com', dayStr(back(540)), 'Terrace-suite regular. Booked Monte Albán tours twice.');
for (const [ago, n] of [[540, 3], [430, 3], [300, 2], [140, 3], [21, 3]] as const) {
  stay.run(1, dayStr(back(ago)), dayStr(back(ago - n)), 'booking', 14588, 1400, 500);
}

// Laura R. — LOYAL, Expedia, heavy restaurant spend → cooking-class cross-sell.
guest.run(2, 'Laura R.', 'laura.r@example.com', dayStr(back(400)), 'Big Alaria Cocina fan; always asks the chef for recommendations.');
for (const [ago, n] of [[400, 2], [210, 2], [75, 3]] as const) {
  stay.run(2, dayStr(back(ago)), dayStr(back(ago - n)), 'expedia', 8200, 2100, 0);
}

// Miguel A. — LOYAL via Booking.
guest.run(3, 'Miguel A.', 'miguel.a@example.com', dayStr(back(350)), null);
for (const [ago, n] of [[350, 2], [180, 2], [60, 2]] as const) {
  stay.run(3, dayStr(back(ago)), dayStr(back(ago - n)), 'booking', 6900, 400, 0);
}

// Sofia T. — PROMISING: two recent stays.
guest.run(4, 'Sofia T.', 'sofia.t@example.com', dayStr(back(130)), null);
for (const [ago, n] of [[130, 2], [40, 2]] as const) {
  stay.run(4, dayStr(back(ago)), dayStr(back(ago - n)), 'booking', 7400, 300, 350);
}

// Roberto D. — DORMANT: suite-level spend, silent for 8 months.
guest.run(5, 'Roberto D.', 'roberto.d@example.com', dayStr(back(500)), 'Suite guest, high spender. No visit in 8 months.');
for (const [ago, n] of [[500, 4], [380, 3], [245, 4]] as const) {
  stay.run(5, dayStr(back(ago)), dayStr(back(ago - n)), 'expedia', 18900, 2600, 1200);
}

// Background population so RFM works over a real crowd.
const NAMES = ['Ana G.', 'Luis H.', 'Elena P.', 'Jorge S.', 'María V.', 'Pedro F.', 'Lucía C.', 'Diego R.', 'Carmen M.', 'Raúl L.'];
for (let id = 6; id <= 50; id++) {
  const firstAgo = between(60, 540);
  guest.run(id, choice(NAMES), null, dayStr(back(firstAgo)), null);
  const nights = between(1, 4);
  stay.run(id, dayStr(back(firstAgo)), dayStr(back(firstAgo - nights)),
    choice(['booking', 'booking', 'expedia', 'direct']), between(3000, 12000), between(0, 1500), 0);
}

/* ---------- imported guest history (data/guest_history.csv) ----------
 * Stay-level history with distributions modeled on 12 months of REAL
 * arrival data from the Oaxaca hotel (fully anonymized upstream — the CSV
 * carries fictitious names only). Enriches the RFM population toward the
 * ~200-guest target without touching the audit choreography: these are
 * stays/guests only, never invoice lines. Dates are all 2025, so none of
 * them can outrank the choreographed CHAMPION/LOYAL picks (r_days > 180).
 */
{
  const csvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/guest_history.csv');
  if (existsSync(csvPath)) {
    const lines = readFileSync(csvPath, 'utf-8').trim().split('\n').slice(1);
    const SURNAMES = ['Ibarra', 'Quintero', 'Salas', 'Mendieta', 'Rocha', 'Palacios', 'Arriaga', 'Bautista', 'Zepeda', 'Fuentes', 'Montaño', 'Serrano'];
    const seen = new Map<string, { id: number; count: number }>();
    let importId = 100;
    let variant = 0;
    for (const line of lines) {
      const [rawName, channel, checkin, nightsStr, revenueStr] = line.split(',');
      const nights = Number(nightsStr);
      const revenue = Number(revenueStr);
      // the fictitious name pool upstream is small — keep at most 2 stays per
      // name and rename the overflow so the crowd stays wide
      let name = rawName;
      let entry = seen.get(rawName);
      if (entry && entry.count >= 2) {
        name = `${rawName.split(' ')[0]} ${SURNAMES[variant++ % SURNAMES.length]}`;
        entry = seen.get(name);
      }
      if (!entry) {
        entry = { id: importId++, count: 0 };
        seen.set(name, entry);
        guest.run(entry.id, name, null, checkin, null);
      }
      entry.count++;
      const out = new Date(checkin);
      out.setDate(out.getDate() + nights);
      stay.run(entry.id, checkin, dayStr(out), channel, revenue, 0, 0);
    }
  }
}

/* ---------- LR · pre-seeded learned rule (agent must announce "1 exemption on file") ---------- */
rule.run(
  "Reservations for guests of 'Corporativo Mixteca' fall under a corporate agreement with its own negotiated commission. Never dispute their invoice lines.",
  'dispute', 'preseeded',
);

/* ---------- S0 · sentinel live catch (dynamic: "last night") ----------
 * Res #1327: FLEX no-show last night, nothing marked on Booking's extranet.
 * BKG-§5.1 gives 48h from check-in → about 36h remain whenever the demo runs.
 * Unmarked cost: 17% × 10,882 ≈ $1,850 at risk. */
{
  const checkin = back(1);
  checkin.setHours(15, 0, 0, 0);
  const out = new Date(checkin);
  out.setDate(out.getDate() + 2);
  reservation.run(1327, 'booking', 'J. Fernández', dayStr(checkin), dayStr(out), null,
    2, 0, 'FLEX', 5441, 0, 0, 'no_show');
  // no extranet_log row on purpose — the sentinel sweep must catch this
}

/* ---------- D1 · early departure on FLEX → DISPUTABLE HIGH, overcharge ≈ $756 ----------
 * Res #1284: booked 7, stayed 5, hotel refunded 2 nights (4,448).
 * Invoice line 11 charges commission on the full 7 nights anyway. */
reservation.run(1284, 'booking', 'A. Robles', '2026-06-08', '2026-06-15', '2026-06-13',
  7, 5, 'FLEX', 2224, 11120, 4448, 'early_departure');
extranet.run('booking', 1284, 'stay_shortened', '2026-06-13T18:22:00Z', '0641');
invoiceLine.run('booking', MONTH, 11, 1284, 'Res 1284 · A. Robles · 7 nights', 15568, 17, 2646.56);
// correct commission: 17% × 11,120 = 1,890.40 → overcharge 756.16

/* ---------- D2 · marked on time yet billed in full → DISPUTABLE HIGH, $2,120 ----------
 * Res #1298: no-show marked within the 48h window (LOG-0709), fee waived as goodwill.
 * Invoice line 23 still bills the full commission — the OTA never processed the mark. */
reservation.run(1298, 'booking', 'P. Castañeda', '2026-06-11', '2026-06-16', null,
  5, 0, 'FLEX', 2494, 0, 0, 'no_show');
extranet.run('booking', 1298, 'no_show_marked', '2026-06-12T09:14:00Z', '0709');
invoiceLine.run('booking', MONTH, 23, 1298, 'Res 1298 · P. Castañeda · 5 nights', 12470, 17, 2119.9);

/* ---------- D3 · rate mismatch with missing evidence → VERIFY MEDIUM, delta $420 ----------
 * Res #1305 (Expedia): commission computed on 15,200 but the guest paid 12,400.
 * checkout_actual intentionally NULL: agent must flag the missing record. */
reservation.run(1305, 'expedia', 'M. Duarte', '2026-06-17', '2026-06-21', null,
  4, 4, 'FLEX', 3100, 12400, 0, 'completed');
invoiceLine.run('expedia', MONTH, 7, 1305, 'Res 1305 · M. Duarte · 4 nights', 15200, 15, 2280);
// billed 2,280 vs correct 1,860 → 420, but the check-out record is missing

/* ---------- D4 · same symptom as D1, opposite verdict → NOT_DISPUTABLE HIGH ----------
 * Res #1310: booked 7, stayed 5 — but the rate is NR. The hotel kept every peso
 * (13,860, zero refunds), so commission on the full amount is contractually right. */
reservation.run(1310, 'booking', 'R. Ortega', '2026-06-05', '2026-06-12', '2026-06-10',
  7, 5, 'NR', 1980, 13860, 0, 'early_departure');
invoiceLine.run('booking', MONTH, 17, 1310, 'Res 1310 · R. Ortega · 7 nights', 13860, 17, 2356.2);

/* ---------- clean filler lines: Booking 30 lines total, Expedia 15 ---------- */
let nextRes = 1400;
function fill(ota: 'booking' | 'expedia', pct: number, count: number, taken: number[]) {
  let line = 1;
  for (let i = 0; i < count; i++) {
    while (taken.includes(line)) line++;
    const id = nextRes++;
    const nights = between(1, 5);
    const rate = between(1800, 5000);
    const total = nights * rate;
    const day = String(between(1, 24)).padStart(2, '0');
    const name = choice(NAMES);
    reservation.run(id, ota, name, `2026-06-${day}`, `2026-06-${day}`, `2026-06-${day}`,
      nights, nights, choice(['FLEX', 'FLEX', 'NR']), rate, total, 0, 'completed');
    invoiceLine.run(ota, MONTH, line, id, `Res ${id} · ${name} · ${nights} nights`, total, pct, +(total * pct / 100).toFixed(2));
    line++;
  }
}
fill('booking', 17, 27, [11, 17, 23]);
fill('expedia', 15, 14, [7]);

const count = (t: string) => (db.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as any).c;
console.log(`✓ seeded ${DB_PATH}`);
for (const t of ['guests', 'stays', 'reservations', 'invoice_lines', 'extranet_log', 'learned_rules']) {
  console.log(`  ${t}: ${count(t)}`);
}
console.log('  cases: S0=#1327 D1=#1284 D2=#1298 D3=#1305 D4=#1310 + 5 win-back guests + 1 rule');
