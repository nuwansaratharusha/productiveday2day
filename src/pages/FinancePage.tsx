// =============================================================
// ProductiveDay — Finance Tracker  (CashBook-style UI)
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
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
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

function groupByDate(txs: Transaction[]) {
  const map: Record<string, Transaction[]> = {};
  [...txs].sort((a, b) => b.date.localeCompare(a.date)).forEach(tx => {
    (map[tx.date] = map[tx.date] || []).push(tx);
  });
  return Object.entries(map);
}

// ─── Summary Cards ────────────────────────────────────────────

function SummaryCards({ monthly, recurring, month }: {
  monthly: Transaction[];
  recurring: Transaction[];
  month: string;
}) {
  const allForMonth = [
    ...monthly,
    ...recurring.map(tx => ({ ...tx, date: recurringDateForMonth(tx, month) })),
  ];
  const totalIn = allForMonth.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = allForMonth.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
  const net = totalIn - totalOut;

  return (
    <div className="grid grid-cols-3 gap-3 px-4 pt-4">
      {/* Net Balance */}
      <div className="bg-white dark:bg-card border border-border/60 rounded-2xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Net Balance</span>
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
            <span className="text-sm">💼</span>
          </div>
        </div>
        <p className={`text-lg font-bold leading-tight ${net >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500"}`}>
          ${fmtMoney(Math.abs(net))}
        </p>
        {net < 0 && <p className="text-[9px] text-red-400 font-medium mt-0.5">Over budget</p>}
      </div>

      {/* Total Cash In */}
      <div className="bg-white dark:bg-card border border-border/60 rounded-2xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Cash In</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
          ${fmtMoney(totalIn)}
        </p>
      </div>

      {/* Total Cash Out */}
      <div className="bg-white dark:bg-card border border-border/60 rounded-2xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Cash Out</span>
          <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-5a1 1 0 10-2 0V9.414l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 9.414V13z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <p className="text-lg font-bold text-red-500 dark:text-red-400 leading-tight">
          ${fmtMoney(totalOut)}
        </p>
      </div>
    </div>
  );
}

// ─── AI Insights Banner ───────────────────────────────────────

function AIInsightsBanner({ transactions, recurring, month }: {
  transactions: Transaction[];
  recurring: Transaction[];
  month: string;
}) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const allTxs = [
    ...transactions,
    ...recurring.map(tx => ({ ...tx, date: recurringDateForMonth(tx, month) })),
  ];

  const totalIn = allTxs.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = allTxs.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);

  const handleAnalyze = () => {
    if (allTxs.length === 0) {
      setInsight("No transactions this month yet. Start adding your income and expenses to get AI-powered insights!");
      return;
    }
    setLoading(true);
    // Simple local insight (no API call to save credits)
    setTimeout(() => {
      const net = totalIn - totalOut;
      const savingsRate = totalIn > 0 ? ((net / totalIn) * 100).toFixed(0) : "0";
      const topCategory = (() => {
        const map: Record<string, number> = {};
        allTxs.filter(t => t.type === "debit").forEach(t => {
          map[t.category] = (map[t.category] || 0) + Number(t.amount);
        });
        const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
        return top ? `${top[0]} ($${fmtMoney(top[1])})` : "None";
      })();
      setInsight(
        net >= 0
          ? `Great job! You saved $${fmtMoney(net)} this month — a ${savingsRate}% savings rate. Top spending: ${topCategory}.`
          : `You're $${fmtMoney(Math.abs(net))} over budget this month. Top spending: ${topCategory}. Consider reducing discretionary expenses.`
      );
      setLoading(false);
    }, 800);
  };

  return (
    <div className="mx-4 mt-3">
      <div className="bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-indigo-500/10 border border-violet-200/60 dark:border-violet-800/40 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">AI Insights</p>
            <p className="text-[11px] text-muted-foreground">
              {insight || "Get smart analysis of your finances"}
            </p>
          </div>
          {!insight && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-transform disabled:opacity-60"
            >
              {loading ? (
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Analyze <span>→</span></>
              )}
            </button>
          )}
          {insight && (
            <button onClick={() => setInsight(null)} className="shrink-0 text-muted-foreground hover:text-foreground text-lg">
              ×
            </button>
          )}
        </div>
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
    <div className="mx-4 mt-3 bg-white dark:bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <span className="text-base">📊</span> Spending Breakdown
      </h3>
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
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: meta.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Entry Row ────────────────────────────────────────────────

function EntryRow({ tx, onEdit }: { tx: Transaction; onEdit: (tx: Transaction) => void }) {
  const meta = getCategoryMeta(tx.category);
  const isCredit = tx.type === "credit";
  return (
    <button
      onClick={() => onEdit(tx)}
      className="w-full flex items-center gap-3 py-3 text-left active:bg-muted/40 transition-colors rounded-xl px-1"
    >
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: meta.color + "22" }}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug truncate">{tx.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{tx.category}</span>
          {tx.recurring && (
            <span className="text-[9px] bg-blue-50 dark:bg-blue-950/50 text-blue-500 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold">
              Recurring
            </span>
          )}
        </div>
      </div>
      <p className={`text-sm font-bold shrink-0 ${isCredit ? "text-emerald-500" : "text-red-500"}`}>
        {isCredit ? "+" : "−"}${fmtMoney(Number(tx.amount))}
      </p>
    </button>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────

function EntryModal({
  open, onClose, editTx, defaultType, onSaved, onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  editTx: Transaction | null;
  defaultType: TxType;
  onSaved: (tx: Transaction) => void;
  onDeleted: (id: string) => void;
}) {
  const [type, setType] = useState<TxType>(defaultType);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [date, setDate] = useState(todayStr());
  const [recurring, setRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editTx) {
      setType(editTx.type);
      setAmount(String(editTx.amount));
      setTitle(editTx.title);
      setCategory(editTx.category);
      setDate(editTx.date);
      setRecurring(editTx.recurring);
      setRecurringDay(editTx.recurring_day ?? 1);
      setNotes(editTx.notes ?? "");
    } else {
      setType(defaultType);
      setAmount("");
      setTitle("");
      setCategory("Other");
      setDate(todayStr());
      setRecurring(false);
      setRecurringDay(1);
      setNotes("");
    }
    setTimeout(() => amountRef.current?.focus(), 100);
  }, [open, editTx, defaultType]);

  const handleSave = async () => {
    if (!amount || !title.trim()) return;
    setSaving(true);
    const payload: TransactionInsert = {
      title: title.trim(),
      amount: parseFloat(amount),
      type,
      category,
      date,
      recurring,
      recurring_day: recurring ? recurringDay : null,
      notes: notes.trim() || null,
    };
    let res;
    if (editTx) {
      res = await updateTransaction(editTx.id, payload);
    } else {
      res = await createTransaction(payload);
    }
    setSaving(false);
    if (res.data) { onSaved(res.data); onClose(); }
  };

  const handleDelete = async () => {
    if (!editTx) return;
    setDeleting(true);
    await deleteTransaction(editTx.id);
    setDeleting(false);
    onDeleted(editTx.id);
    onClose();
  };

  if (!open) return null;

  const catMeta = getCategoryMeta(category);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl border border-border/30 overflow-hidden">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Type Toggle — full width at top */}
        <div className="flex gap-0 mt-3 mx-4 mb-4 bg-muted rounded-2xl p-1 border border-border/40">
          <button
            onClick={() => setType("credit")}
            className={`flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              type === "credit"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Cash In
          </button>
          <button
            onClick={() => setType("debit")}
            className={`flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              type === "debit"
                ? "bg-red-500 text-white shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
            </svg>
            Cash Out
          </button>
        </div>

        <div className="px-4 pb-6 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Amount — Big and prominent */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-semibold">$</span>
              <input
                ref={amountRef}
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-muted/50 dark:bg-muted/30 border border-border/40 rounded-2xl pl-9 pr-4 py-3.5 text-xl font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
              />
            </div>
          </div>

          {/* Remark / Description */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Remark
            </label>
            <textarea
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === "credit" ? "What was this for? e.g. Brand deal, Salary..." : "What did you spend on?"}
              rows={2}
              className="w-full bg-muted/50 dark:bg-muted/30 border border-border/40 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 resize-none"
            />
          </div>

          {/* Category picker */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Category (Optional)
            </label>
            <button
              type="button"
              onClick={() => setShowCatPicker(v => !v)}
              className="w-full flex items-center gap-3 bg-muted/50 dark:bg-muted/30 border border-border/40 rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none"
            >
              <span className="text-lg">{catMeta.icon}</span>
              <span className="flex-1 text-left font-medium">{category}</span>
              <svg className={`w-4 h-4 text-muted-foreground transition-transform ${showCatPicker ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCatPicker && (
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    onClick={() => { setCategory(c.key); setShowCatPicker(false); }}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-center transition-all border text-[10px] font-medium ${
                      category === c.key
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/30 bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <span className="text-base">{c.icon}</span>
                    <span className="leading-tight">{c.key}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-muted/50 dark:bg-muted/30 border border-border/40 rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
            />
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between bg-muted/40 border border-border/30 rounded-2xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Recurring</p>
              <p className="text-[10px] text-muted-foreground">Repeats every month</p>
            </div>
            <button
              type="button"
              onClick={() => setRecurring(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${recurring ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${recurring ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          {recurring && (
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Day of Month
              </label>
              <input
                type="number"
                min={1} max={31}
                value={recurringDay}
                onChange={e => setRecurringDay(Number(e.target.value))}
                className="w-full bg-muted/50 dark:bg-muted/30 border border-border/40 rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSave}
            disabled={saving || !amount || !title.trim()}
            className={`w-full h-12 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm ${
              type === "credit"
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : editTx ? "Update Entry" : type === "credit" ? "Add Cash In" : "Add Cash Out"}
          </button>

          {/* Delete (edit mode) */}
          {editTx && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full h-10 rounded-2xl text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              {deleting ? "Deleting..." : "Delete Entry"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function FinancePage() {
  const [month, setMonth] = useState(currentMonth);
  const [monthly, setMonthly] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [defaultType, setDefaultType] = useState<TxType>("credit");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getTransactions(month);
    if (res.error === "42P01" || (res.error && res.error.includes("does not exist"))) {
      setMissingTable(true);
    } else if (res.data) {
      setMonthly(res.data.monthly);
      setRecurring(res.data.recurring);
    }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  // Display list = monthly + recurring projected
  const allDisplay = [
    ...monthly,
    ...recurring.map(tx => ({ ...tx, id: `rec-${tx.id}`, date: recurringDateForMonth(tx, month) })),
  ];

  const filtered = allDisplay.filter(tx => {
    const matchesFilter = filter === "all" || tx.type === filter;
    const matchesSearch = !search || tx.title.toLowerCase().includes(search.toLowerCase())
      || tx.category.toLowerCase().includes(search.toLowerCase())
      || String(tx.amount).includes(search);
    return matchesFilter && matchesSearch;
  });

  const grouped = groupByDate(filtered);

  const openAdd = (type: TxType) => {
    setEditTx(null);
    setDefaultType(type);
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    if (tx.id.startsWith("rec-")) return; // don't edit recurring projections
    setEditTx(tx);
    setDefaultType(tx.type);
    setModalOpen(true);
  };

  const handleSaved = (tx: Transaction) => {
    if (tx.recurring) {
      setRecurring(prev => {
        const idx = prev.findIndex(t => t.id === tx.id);
        return idx >= 0 ? prev.map(t => t.id === tx.id ? tx : t) : [...prev, tx];
      });
    } else {
      setMonthly(prev => {
        const idx = prev.findIndex(t => t.id === tx.id);
        return idx >= 0 ? prev.map(t => t.id === tx.id ? tx : t) : [tx, ...prev];
      });
    }
  };

  const handleDeleted = (id: string) => {
    setMonthly(prev => prev.filter(t => t.id !== id));
    setRecurring(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-background overflow-hidden">

      {/* ── Top Header ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-card border-b border-border/40 px-4 pt-safe-top pb-3 shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Month navigator */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonth(prevMonth(month))}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted active:bg-muted/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setMonth(currentMonth())}
              className="px-3 h-9 rounded-xl text-sm font-bold text-foreground border border-border/40 bg-white dark:bg-muted/30 min-w-[130px] text-center"
            >
              {monthLabel(month)}
            </button>
            <button
              onClick={() => setMonth(nextMonth(month))}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted active:bg-muted/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => openAdd("credit")}
              className="flex items-center gap-1.5 px-3 h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-xl shadow-sm active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Cash In
            </button>
            <button
              onClick={() => openAdd("debit")}
              className="flex items-center gap-1.5 px-3 h-9 bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold rounded-xl shadow-sm active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
              </svg>
              Cash Out
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Body ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Missing table banner */}
        {missingTable && (
          <div className="mx-4 mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">⚙️ Setup Required</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Run <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded text-[10px]">supabase/migrations/003_finance_tracker.sql</code> in your Supabase SQL Editor to activate Finance Tracker.
            </p>
          </div>
        )}

        {/* Summary Cards */}
        <SummaryCards monthly={monthly} recurring={recurring} month={month} />

        {/* AI Insights */}
        <AIInsightsBanner transactions={monthly} recurring={recurring} month={month} />

        {/* Breakdown toggle */}
        {monthly.length > 0 && (
          <div className="px-4 mt-3">
            <button
              onClick={() => setShowBreakdown(v => !v)}
              className="w-full flex items-center justify-between bg-white dark:bg-card border border-border/40 rounded-2xl px-4 py-3 text-sm font-semibold text-foreground shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span>📊</span> Spending Breakdown
              </span>
              <svg className={`w-4 h-4 text-muted-foreground transition-transform ${showBreakdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showBreakdown && <CategoryBreakdown transactions={[...monthly, ...recurring]} />}
          </div>
        )}

        {/* Search + Filter */}
        <div className="px-4 mt-3 flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by remark or amount..."
              className="w-full bg-white dark:bg-card border border-border/40 rounded-2xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
            />
          </div>
          <div className="flex gap-1 bg-white dark:bg-card border border-border/40 rounded-2xl p-1 shadow-sm">
            {(["all", "credit", "debit"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold capitalize transition-all ${
                  filter === f
                    ? f === "credit" ? "bg-emerald-500 text-white"
                      : f === "debit" ? "bg-red-500 text-white"
                      : "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}>
                {f === "credit" ? "In" : f === "debit" ? "Out" : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Entries */}
        <div className="mx-4 mt-3 mb-24">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center justify-between">
            Entries
            {filtered.length > 0 && (
              <span className="text-[10px] text-muted-foreground font-normal">{filtered.length} transactions</span>
            )}
          </h3>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-xs">Loading entries...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-card border border-border/40 rounded-2xl flex flex-col items-center justify-center py-12 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center text-2xl mb-3">
                📋
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No entries yet</p>
              <p className="text-xs text-muted-foreground text-center px-8">
                {search ? "No transactions match your search." : "Start adding your cash in and cash out entries"}
              </p>
              {!search && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => openAdd("credit")}
                    className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform">
                    + Cash In
                  </button>
                  <button onClick={() => openAdd("debit")}
                    className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform">
                    − Cash Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden">
              {grouped.map(([dateStr, txs], gi) => (
                <div key={dateStr}>
                  {/* Date header */}
                  <div className={`px-4 py-2 bg-muted/30 flex items-center justify-between ${gi > 0 ? "border-t border-border/30" : ""}`}>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      {fmtDate(dateStr)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {txs.length} {txs.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  {/* Transaction rows */}
                  <div className="px-3 divide-y divide-border/20">
                    {txs.map(tx => (
                      <EntryRow key={tx.id} tx={tx} onEdit={openEdit} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom padding for nav */}
        <div className="h-safe-bottom" />
      </div>

      {/* Add/Edit Modal */}
      <EntryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editTx={editTx}
        defaultType={defaultType}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
