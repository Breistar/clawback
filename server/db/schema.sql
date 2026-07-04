-- Clawback data model. One audited month of operations + 18 months of guest history.
-- The agent's tools read these tables and write findings back (disputes/offers/learned_rules).

CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  first_seen TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS stays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  checkin TEXT NOT NULL,
  checkout TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('booking','expedia','direct')),
  room_revenue REAL NOT NULL,
  restaurant_spend REAL NOT NULL DEFAULT 0,
  tours_spend REAL NOT NULL DEFAULT 0
);

-- PMS view of the audited month. Citation id: PMS-<id>
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY,
  ota TEXT NOT NULL CHECK (ota IN ('booking','expedia')),
  guest_name TEXT NOT NULL,
  checkin TEXT NOT NULL,
  checkout_booked TEXT NOT NULL,
  checkout_actual TEXT,
  nights_booked INTEGER NOT NULL,
  nights_stayed INTEGER NOT NULL,
  rate_plan TEXT NOT NULL CHECK (rate_plan IN ('FLEX','NR')),
  nightly_rate REAL NOT NULL,
  amount_charged REAL NOT NULL,
  amount_refunded REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('completed','no_show','early_departure','cancelled'))
);

-- Monthly OTA invoices. Citation id: INV-L<line_no>
CREATE TABLE IF NOT EXISTS invoice_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ota TEXT NOT NULL CHECK (ota IN ('booking','expedia')),
  invoice_month TEXT NOT NULL,
  line_no INTEGER NOT NULL,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id),
  description TEXT NOT NULL,
  base_amount REAL NOT NULL,
  commission_pct REAL NOT NULL,
  commission_amount REAL NOT NULL
);

-- What the hotel declared on each OTA portal. Citation id: LOG-<log_ref>
CREATE TABLE IF NOT EXISTS extranet_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ota TEXT NOT NULL,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id),
  event_type TEXT NOT NULL,
  marked_at TEXT NOT NULL,
  log_ref TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learned_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_text TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'dispute',
  source TEXT NOT NULL DEFAULT 'chat',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS disputes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL,
  ota TEXT NOT NULL,
  finding TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('DISPUTABLE','NOT_DISPUTABLE','VERIFY','AT_RISK')),
  confidence TEXT NOT NULL CHECK (confidence IN ('HIGH','MEDIUM','LOW')),
  confidence_reason TEXT NOT NULL,
  amount REAL NOT NULL,
  evidence TEXT NOT NULL,
  memo_md TEXT,
  window_deadline TEXT,
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  segment TEXT NOT NULL CHECK (segment IN ('CHAMPION','LOYAL','PROMISING','DORMANT')),
  r_days INTEGER NOT NULL,
  f_stays INTEGER NOT NULL,
  m_avg REAL NOT NULL,
  channel TEXT NOT NULL,
  burned_per_visit REAL NOT NULL,
  burned_per_year REAL NOT NULL,
  offer_md TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
);
