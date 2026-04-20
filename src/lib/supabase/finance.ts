// =============================================================
// ProductiveDay — Finance Tracker (Supabase helpers)
// =============================================================

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── Types ────────────────────────────────────────────────────

export type TxType = "credit" | "debit";

export interface Transaction {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: TxType;
  category: string;
  date: string;         // YYYY-MM-DD
  recurring: boolean;
  recurring_day: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionInsert = Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at">;
export type TransactionUpdate = Partial<Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at">>;

// ─── Categories ───────────────────────────────────────────────

export const CATEGORIES = [
  { key: "Business",      icon: "briefcase",   color: "#6366F1" },
  { key: "Creator",       icon: "video",       color: "#A78BFA" },
  { key: "Salary",        icon: "trending-up", color: "#4ADE80" },
  { key: "Freelance",     icon: "zap",         color: "#34D399" },
  { key: "Brand Deal",    icon: "handshake",   color: "#2DD4BF" },
  { key: "Ad Revenue",    icon: "bar-chart",   color: "#60A5FA" },
  { key: "Housing",       icon: "building",    color: "#FB923C" },
  { key: "Food",          icon: "leaf",        color: "#F97316" },
  { key: "Transport",     icon: "activity",    color: "#FACC15" },
  { key: "Subscriptions", icon: "layers",      color: "#F472B6" },
  { key: "Health",        icon: "heart",       color: "#F87171" },
  { key: "Tools",         icon: "settings",    color: "#94A3B8" },
  { key: "Entertainment", icon: "music",       color: "#C084FC" },
  { key: "Savings",       icon: "target",      color: "#86EFAC" },
  { key: "Personal",      icon: "sun",         color: "#64748B" },
  { key: "Other",         icon: "package",     color: "#94A3B8" },
] as const;

export type CategoryKey = typeof CATEGORIES[number]["key"];

export function getCategoryMeta(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? { key, icon: "package", color: "#94A3B8" };
}

// ─── CRUD ─────────────────────────────────────────────────────

/** Fetch all transactions for a given month (YYYY-MM) + all recurring templates */
export async function getTransactions(month: string) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const monthStart = `${month}-01`;
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

  // Fetch this month's transactions
  const { data: monthly, error: e1 } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("recurring", false)
    .gte("date", monthStart)
    .lte("date", monthEnd)
    .order("date", { ascending: false });

  // Fetch recurring templates (all-time, not duplicated)
  const { data: recurring, error: e2 } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("recurring", true)
    .order("created_at", { ascending: true });

  if (e1 || e2) return { data: null, error: e1?.message || e2?.message || "Query failed" };

  return {
    data: { monthly: (monthly || []) as Transaction[], recurring: (recurring || []) as Transaction[] },
    error: null,
  };
}

export async function createTransaction(tx: TransactionInsert) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...tx, user_id: user.id })
    .select()
    .single();

  return { data: data as Transaction | null, error: error?.message || null };
}

export async function updateTransaction(id: string, updates: TransactionUpdate) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data: data as Transaction | null, error: error?.message || null };
}

export async function deleteTransaction(id: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message || null };
}
