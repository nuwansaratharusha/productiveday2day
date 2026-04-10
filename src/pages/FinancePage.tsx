// =============================================================
// ProductiveDay — Finance Tracker
// =============================================================
// Monthly credit/debit tracker for creators & entrepreneurs.
// Summary at top → category breakdown → recurring → tx list.
// =============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  CATEGORIES, getCategoryMeta,
  type Transaction, type TxType, type TransactionInsert,
} from "@/lib/supabase/finance";

// ─── Helpers ──────────────────────────────────────────────────

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function recurringDateForMonth(tx: Transaction, month: string) {
  const day = tx.recurring_day ?? new Date(tx.date).getDate();
  const [y, mo] = month.split("-").map(Number);
  const lastDay = new Date(y, mo, 0).getDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

// ─── Summary Card ─────────────────────────────────────────────

function SummaryCard({ label, value, icon, accent, sub }: {
  label: string; value: number; icon: string;
  accent: string; sub?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border/50 p-4 flex items-center gap-3 bg-card`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-foreground leading-tight">
          {value >= 0 ? "" : "−"}${fmtMoney(Math.abs(value))}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Category Breakdown ───────────────────────────────────────

function CategoryBreakdown({ transactions }: { transactions: Transaction[] }) {
  const debitsByCategory: Record<string, number> = {};
  transactions.filter(t => t.type === "debit").forEach(t => {
    debitsByCategory[t.category] = (debitsByCategory[t.category] || 0) + Number(t.amount);
  });

  const sorted = Object.entries(debitsByCategory).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4">
      <h3 className="text-sm font-bold text-foreground mb-3">Spending by Category</h3>
      <div className="space-y-2.5">
        {sorted.slice(0, 6).map(([cat, amount]) => {
          const meta = getCategoryMeta(cat);
          const pct = Math.round((amount / total) * 100);
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{meta.icon}</span>
                  <span className="text-xs text-foreground font-medium">{cat}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{pct}%</span>
                  <span className="text-xs font-bold text-foreground">${fmtMoney(amount)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: meta.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Transaction Card ─────────────────────────────────────────

function TxCard({ tx, onDelete, onEdit }: {
  tx: Transaction;
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
}) {
  const meta = getCategoryMeta(tx.category);
  const isCredit = tx.type === "credit";

  return (
    <div
      onClick={() => onEdit(tx)}
      className="flex items-center gap-3 py-3 px-1 border-b border-border/30 last:border-0 cursor-pointer active:bg-muted/30 transition-colors group"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
        style={{ backgroundColor: meta.color + "20" }}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug truncate">{tx.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{fmtDate(tx.date)}</span>
          {tx.recurring && (
            <span className="text-[9px] bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold">
              🔄 Recurring
            </span>
          )}
          <span className="text-[9px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded-full">{tx.category}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-bold ${isCredit ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
          {isCredit ? "+" : "−"}${fmtMoney(Number(tx.amount))}
        </p>
        <button
          onClick={e => { e.stopPropagation(); onDelete(tx.id); }}
          className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Recurring Section ────────────────────────────────────────

function RecurringSection({ templates, month, onLogNow }: {
  templates: Transaction[];
  month: string;
  onLogNow: (tx: Transaction) => void;
}) {
  if (templates.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">🔄</span>
        <h3 className="text-sm font-bold text-foreground">Recurring This Month</h3>
        <span className="text-[10px] bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold ml-auto">
          {templates.length}
        </span>
      </div>
      <div className="space-y-2">
        {templates.map(tx => {
          const meta = getCategoryMeta(tx.category);
          const isCredit = tx.type === "credit";
          const dueDate = recurringDateForMonth(tx, month);
          return (
            <div key={tx.id}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/30">
              <span className="text-base shrink-0">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{tx.title}</p>
                <p className="text-[10px] text-muted-foreground">Due {fmtDate(dueDate)}</p>
              </div>
              <p className={`text-xs font-bold shrink-0 ${isCredit ? "text-emerald-500" : "text-red-500"}`}>
                {isCredit ? "+" : "−"}${fmtMoney(Number(tx.amount))}
              </p>
              <button
                onClick={() => onLogNow(tx)}
                className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg hover:bg-primary/20 active:scale-95 transition-all shrink-0">
                Log
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add / Edit Sheet ─────────────────────────────────────────

interface SheetProps {
  open: boolean;
  editTx?: Transaction | null;
  prefillType?: TxType;
  prefillFromRecurring?: Transaction | null;
  onClose: () => void;
  onSave: () => void;
}

const DEFAULT_TYPE: TxType = "debit";

function AddEditSheet({ open, editTx, prefillFromRecurring, prefillType, onClose, onSave }: SheetProps) {
  const [title, setTitle]       = useState("");
  const [amount, setAmount]     = useState("");
  const [type, setType]         = useState<TxType>(DEFAULT_TYPE);
  const [category, setCategory] = useState("Personal");
  const [date, setDate]         = useState(todayStr());
  const [recurring, setRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState<string>("");
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editTx) {
      setTitle(editTx.title);
      setAmount(String(editTx.amount));
      setType(editTx.type);
      setCategory(editTx.category);
      setDate(editTx.date);
      setRecurring(editTx.recurring);
      setRecurringDay(editTx.recurring_day ? String(editTx.recurring_day) : "");
      setNotes(editTx.notes || "");
    } else if (prefillFromRecurring) {
      // Logging a recurring item for this month
      setTitle(prefillFromRecurring.title);
      setAmount(String(prefillFromRecurring.amount));
      setType(prefillFromRecurring.type);
      setCategory(prefillFromRecurring.category);
      setDate(todayStr());
      setRecurring(false);
      setRecurringDay("");
      setNotes("");
    } else {
      setTitle(""); setAmount(""); setType(prefillType || DEFAULT_TYPE);
      setCategory("Personal"); setDate(todayStr());
      setRecurring(false); setRecurringDay(""); setNotes("");
    }
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, editTx, prefillType, prefillFromRecurring]);

  async function handleSave() {
    if (!title.trim() || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    setSaving(true);
    const payload: Omit<TransactionInsert, "user_id"> = {
      title: title.trim(),
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      type, category, date, recurring,
      recurring_day: recurring && recurringDay ? parseInt(recurringDay) : null,
      notes: notes.trim() || null,
    };
    if (editTx) {
      await updateTransaction(editTx.id, payload);
    } else {
      await createTransaction(payload as TransactionInsert);
    }
    setSaving(false);
    onSave();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-t-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 shrink-0 border-b border-border/30">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              {editTx ? "Edit Transaction" : prefillFromRecurring ? "Log Recurring" : "New Transaction"}
            </h2>
            <button onClick={onClose} className="text-muted-foreground text-xl hover:text-foreground">✕</button>
          </div>

          {/* Credit / Debit toggle */}
          {!editTx && (
            <div className="flex gap-2 mt-3">
              {(["credit", "debit"] as TxType[]).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 h-10 rounded-xl text-sm font-bold capitalize transition-all active:scale-95 ${
                    type === t
                      ? t === "credit"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-red-500 text-white shadow-sm"
                      : "bg-muted text-muted-foreground"
                  }`}>
                  {t === "credit" ? "💵 Income" : "💸 Expense"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-4">

          {/* Title */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Title
            </label>
            <input
              ref={inputRef}
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder={type === "credit" ? "e.g. Brand deal payment" : "e.g. Monthly rent"}
              className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/20"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Amount ($)
            </label>
            <input
              type="number" inputMode="decimal" min="0" step="0.01"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-muted/50 rounded-xl px-4 py-3 text-lg font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/20"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Category
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => setCategory(cat.key)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-[9px] font-bold transition-all active:scale-95 border ${
                    category === cat.key
                      ? "border-transparent text-white shadow-sm"
                      : "border-border/50 bg-muted text-muted-foreground"
                  }`}
                  style={category === cat.key ? { backgroundColor: cat.color } : {}}>
                  <span className="text-sm">{cat.icon}</span>
                  <span className="leading-tight text-center">{cat.key.length > 8 ? cat.key.slice(0,7)+"…" : cat.key}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Date
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/20" />
          </div>

          {/* Recurring toggle */}
          <div className="rounded-2xl border border-border/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">🔄 Recurring</p>
                <p className="text-[11px] text-muted-foreground">Repeats every month on a fixed day</p>
              </div>
              <button onClick={() => setRecurring(r => !r)}
                className={`w-12 h-6 rounded-full transition-colors relative ${recurring ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${recurring ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
            {recurring && (
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Day of month
                </label>
                <input
                  type="number" inputMode="numeric" min="1" max="31"
                  value={recurringDay} onChange={e => setRecurringDay(e.target.value)}
                  placeholder="e.g. 1 for 1st of every month"
                  className="w-full bg-muted/50 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/20"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Notes (optional)
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Invoice #, vendor name, purpose…"
              className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none border border-transparent focus:border-primary/20" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 border-t border-border/30 shrink-0 bg-background"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <button onClick={handleSave}
            disabled={!title.trim() || !amount || Number(amount) <= 0 || saving}
            className={`w-full h-14 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40 shadow-sm text-white ${
              type === "credit"
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-primary hover:opacity-90"
            }`}>
            {saving ? "Saving…" : editTx ? "Save Changes" : `Add ${type === "credit" ? "Income" : "Expense"} →`}
          </button>
          {editTx && (
            <button onClick={async () => {
              if (!confirm("Delete this transaction?")) return;
              await deleteTransaction(editTx.id);
              onSave(); onClose();
            }} className="w-full mt-2 h-10 rounded-xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-95">
              Delete Transaction
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function FinancePage() {
  const [month, setMonth]             = useState(currentMonth());
  const [monthly, setMonthly]         = useState<Transaction[]>([]);
  const [recurring, setRecurring]     = useState<Transaction[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [addType, setAddType]         = useState<TxType>("debit");
  const [editTx, setEditTx]           = useState<Transaction | null>(null);
  const [logRecurring, setLogRecurring] = useState<Transaction | null>(null);
  const [missingTable, setMissingTable] = useState(false);
  const [filterType, setFilterType]   = useState<"all" | "credit" | "debit">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getTransactions(month);
    if (error) {
      if (error.includes("42P01") || error.includes("does not exist")) setMissingTable(true);
      setLoading(false);
      return;
    }
    if (data) {
      setMonthly(data.monthly);
      setRecurring(data.recurring);
    }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ──────────────────────────────────────────
  const totalIncome  = monthly.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = monthly.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
  const net          = totalIncome - totalExpense;

  // Recurring projected totals (for the month)
  const recurringIncome  = recurring.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  const recurringExpense = recurring.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);

  // Filtered list
  const filteredTx = filterType === "all"
    ? monthly
    : monthly.filter(t => t.type === filterType);

  // Group by date
  const byDate: Record<string, Transaction[]> = {};
  filteredTx.forEach(tx => {
    byDate[tx.date] = byDate[tx.date] || [];
    byDate[tx.date].push(tx);
  });
  const dateSorted = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const isCurrentMonth = month === currentMonth();

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground">💰 Finance</h1>
            <p className="text-xs text-muted-foreground">{monthLabel(month)}</p>
          </div>
          {/* Month navigator */}
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth(prevMonth(month))}
              className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-foreground font-bold hover:bg-muted/80 active:scale-95 transition-all text-sm">
              ‹
            </button>
            {!isCurrentMonth && (
              <button onClick={() => setMonth(currentMonth())}
                className="text-[10px] text-primary font-bold px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all">
                Today
              </button>
            )}
            <button onClick={() => setMonth(nextMonth(month))}
              className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-foreground font-bold hover:bg-muted/80 active:scale-95 transition-all text-sm">
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* ── Missing table banner ── */}
        {missingTable && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 p-4">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">⚠️ Database setup required</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Run the SQL migration in <strong>Supabase → SQL Editor</strong>:
              <br /><code className="bg-amber-100 dark:bg-amber-900/50 rounded px-1">supabase/migrations/003_finance_tracker.sql</code>
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-3 gap-2.5">
              <SummaryCard label="Income" value={totalIncome} icon="💵"
                accent="bg-emerald-100 dark:bg-emerald-950/50"
                sub={recurring.filter(t=>t.type==="credit").length > 0 ? `+$${fmtMoney(recurringIncome)} recurring` : undefined} />
              <SummaryCard label="Expenses" value={totalExpense} icon="💸"
                accent="bg-red-100 dark:bg-red-950/50"
                sub={recurring.filter(t=>t.type==="debit").length > 0 ? `$${fmtMoney(recurringExpense)} recurring` : undefined} />
              <SummaryCard label="Net" value={net} icon={net >= 0 ? "📈" : "📉"}
                accent={net >= 0 ? "bg-blue-100 dark:bg-blue-950/50" : "bg-orange-100 dark:bg-orange-950/50"} />
            </div>

            {/* ── Quick add buttons ── */}
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => { setAddType("credit"); setEditTx(null); setLogRecurring(null); setShowAdd(true); }}
                className="h-12 rounded-2xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm">
                + Add Income
              </button>
              <button onClick={() => { setAddType("debit"); setEditTx(null); setLogRecurring(null); setShowAdd(true); }}
                className="h-12 rounded-2xl bg-primary text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
                + Add Expense
              </button>
            </div>

            {/* ── Category breakdown ── */}
            <CategoryBreakdown transactions={monthly} />

            {/* ── Recurring ── */}
            <RecurringSection
              templates={recurring}
              month={month}
              onLogNow={tx => { setLogRecurring(tx); setEditTx(null); setShowAdd(true); }}
            />

            {/* ── Transaction list ── */}
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              {/* List header + filter */}
              <div className="px-4 pt-4 pb-2 border-b border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">Transactions</h3>
                  <span className="text-[10px] text-muted-foreground">{monthly.length} this month</span>
                </div>
                <div className="flex gap-1.5">
                  {[["all","All"],["credit","Income"],["debit","Expenses"]] .map(([v, l]) => (
                    <button key={v} onClick={() => setFilterType(v as typeof filterType)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        filterType === v
                          ? v === "credit" ? "bg-emerald-500 text-white" : v === "debit" ? "bg-red-500 text-white" : "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {monthly.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="text-4xl mb-3 opacity-20">💰</div>
                  <h3 className="text-sm font-bold text-foreground mb-1">No transactions yet</h3>
                  <p className="text-xs text-muted-foreground mb-5">Add your first income or expense to start tracking</p>
                  <button onClick={() => { setAddType("debit"); setEditTx(null); setLogRecurring(null); setShowAdd(true); }}
                    className="px-6 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
                    Add First Transaction
                  </button>
                </div>
              ) : (
                <div className="px-4">
                  {dateSorted.map(date => (
                    <div key={date}>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-2 sticky top-0 bg-card">
                        {fmtDate(date)}
                      </p>
                      {byDate[date].map(tx => (
                        <TxCard key={tx.id} tx={tx}
                          onDelete={async id => {
                            if (!confirm("Delete transaction?")) return;
                            setMonthly(prev => prev.filter(t => t.id !== id));
                            await deleteTransaction(id);
                          }}
                          onEdit={tx => { setEditTx(tx); setLogRecurring(null); setShowAdd(true); }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Recurring manage section ── */}
            {recurring.length > 0 && (
              <div className="bg-card rounded-2xl border border-border/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">Manage Recurring</h3>
                  <span className="text-[10px] text-muted-foreground">{recurring.length} templates</span>
                </div>
                <div className="space-y-2">
                  {recurring.map(tx => {
                    const meta = getCategoryMeta(tx.category);
                    return (
                      <div key={tx.id}
                        onClick={() => { setEditTx(tx); setLogRecurring(null); setShowAdd(true); }}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 cursor-pointer hover:border-border active:bg-muted/20 transition-all">
                        <span className="text-base">{meta.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{tx.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Day {tx.recurring_day ?? new Date(tx.date).getDate()} of every month
                          </p>
                        </div>
                        <p className={`text-xs font-bold shrink-0 ${tx.type === "credit" ? "text-emerald-500" : "text-red-500"}`}>
                          {tx.type === "credit" ? "+" : "−"}${fmtMoney(Number(tx.amount))}
                        </p>
                        <span className="text-muted-foreground text-xs">›</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── FAB ── */}
      <button onClick={() => { setAddType("debit"); setEditTx(null); setLogRecurring(null); setShowAdd(true); }}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-2xl bg-primary text-white text-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center z-40 font-bold">
        +
      </button>

      {/* ── Sheet ── */}
      <AddEditSheet
        open={showAdd}
        editTx={editTx}
        prefillType={addType}
        prefillFromRecurring={logRecurring}
        onClose={() => { setShowAdd(false); setEditTx(null); setLogRecurring(null); }}
        onSave={load}
      />
    </div>
  );
}
