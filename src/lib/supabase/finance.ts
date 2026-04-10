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
  { key: "Business",      icon: "💼", color: "#6366F1" },
  { key: "Creator",       icon: "🎬", color: "#A78BFA" },
  { key: "Salary",        icon: "💵", color: "#4ADE80" },
  { key: "Freelance",     icon: "🧑‍💻", color: "#34D399" },
  { key: "Brand Deal",    icon: "🤝", color: "#2DD4BF" },
  { key: "Ad Revenue",    icon: "📈", color: "#60A5FA" },
  { key: "Housing",       icon: "🏠", color: "#FB923C" },
  { key: "Food",          icon: "🍔", color: "#F97316" },
  { key: "Transport",     icon: "🚗", color: "#FACC15" },
  { key: "Subscriptions", icon: "🔄", color: "#F472B6" },
  { key: "Health",        icon: "🏥", color: "#F87171" },
  { key: "Tools",         icon: "🛠", color: "#94A3B8" },
  { key: "Entertainment", icon: "🎮", color: "#C084FC" },
  { key: "Savings",       icon: "🏦", color: "#86EFAC" },
  { key: "Personal",      icon: "👤", color: "#64748B" },
  { key: "Other",         icon: "📦", color: "#94A3B8" },
] as const;

export type CategoryKey = typeof CATEGORIES[number]["key"];

export function getCategoryMeta(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? { key, icon: "📦", color: "#94A3B8" };
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
