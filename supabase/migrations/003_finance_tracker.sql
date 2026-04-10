-- =============================================================
-- ProductiveDay — Finance Tracker Migration
-- =============================================================
-- Run this in Supabase → SQL Editor
-- =============================================================

-- ── Transactions ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title           text        NOT NULL,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  type            text        NOT NULL CHECK (type IN ('credit', 'debit')),
  category        text        NOT NULL DEFAULT 'General',
  date            date        NOT NULL,
  recurring       boolean     DEFAULT false,
  recurring_day   integer     CHECK (recurring_day BETWEEN 1 AND 31),
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS transactions_user_id_idx   ON transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx      ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS transactions_recurring_idx ON transactions (user_id, recurring) WHERE recurring = true;

-- Row-Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own transactions" ON transactions;
CREATE POLICY "Users manage own transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Seed categories (reference only — categories are stored as text) ──
-- Business · Personal · Creator · Food · Transport · Housing
-- Subscriptions · Entertainment · Health · Tools · Savings · Other
