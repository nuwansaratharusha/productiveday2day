// =============================================================
// ProductiveDay — Finance Tracker  (CashBook2-style UI)
// Currency selector · Language (EN / සි) · AI Insights
// =============================================================

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  CATEGORIES, getCategoryMeta,
  type Transaction, type TxType, type TransactionInsert,
} from "@/lib/supabase/finance";
import {
  CURRENCIES, getSavedCurrency, saveCurrency,
  getSavedLang, saveLang, formatAmount, type Currency,
} from "@/lib/finance/currencies";
import { getT, type FinanceLang } from "@/lib/finance/translations";

// ── shadcn/ui ─────────────────────────────────────────────────
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

// ─── Helpers ──────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d: string, lang: FinanceLang) {
  return new Date(d + "T12:00:00").toLocaleDateString(
    lang === "si" ? "si-LK" : "en-US",
    { weekday: "short", month: "short", day: "numeric" }
  );
}

function monthLabel(m: string, lang: FinanceLang) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString(
    lang === "si" ? "si-LK" : "en-US",
    { month: "long", year: "numeric" }
  );
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

function recurringDateForMonth(tx: Transaction, month: string) {
  const day = tx.recurring_day ?? new Date(tx.date).getDate();
  const [y, mo] = month.split("-").map(Number);
  const lastDay = new Date(y, mo, 0).getDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

// ─── Balance Cards ────────────────────────────────────────────

function BalanceCards({
  monthly, recurring, month, currency,
  t,
}: {
  monthly: Transaction[];
  recurring: Transaction[];
  month: string;
  currency: Currency;
  t: ReturnType<typeof getT>;
}) {
  const all = [
    ...monthly,
    ...recurring.map(tx => ({ ...tx, date: recurringDateForMonth(tx, month) })),
  ];
  const totalIn  = all.filter(x => x.type === "credit").reduce((s, x) => s + Number(x.amount), 0);
  const totalOut = all.filter(x => x.type === "debit" ).reduce((s, x) => s + Number(x.amount), 0);
  const net      = totalIn - totalOut;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
      {/* Net Balance */}
      <div className="min-w-[150px] flex-shrink-0 bg-card border border-border rounded-xl p-4 shadow-sm animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{t("netBalance")}</span>
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <p className={`text-xl font-bold ${net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
          {net < 0 && "−"}{formatAmount(Math.abs(net), currency.symbol)}
        </p>
        {net < 0 && <p className="text-[10px] text-red-400 mt-0.5 font-medium">{t("overBudget")}</p>}
      </div>

      {/* Cash In */}
      <div className="min-w-[150px] flex-shrink-0 bg-card border border-border rounded-xl p-4 shadow-sm animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{t("totalCashIn")}</span>
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
          </svg>
        </div>
        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
          {formatAmount(totalIn, currency.symbol)}
        </p>
      </div>

      {/* Cash Out */}
      <div className="min-w-[150px] flex-shrink-0 bg-card border border-border rounded-xl p-4 shadow-sm animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{t("totalCashOut")}</span>
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
          </svg>
        </div>
        <p className="text-xl font-bold text-red-500 dark:text-red-400">
          {formatAmount(totalOut, currency.symbol)}
        </p>
      </div>
    </div>
  );
}

// ─── AI Insights ──────────────────────────────────────────────

function AIInsights({
  transactions, recurring, month, currency, t,
}: {
  transactions: Transaction[];
  recurring: Transaction[];
  month: string;
  currency: Currency;
  t: ReturnType<typeof getT>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<{ type: string; title: string; desc: string }[]>([]);

  const all = [
    ...transactions,
    ...recurring.map(tx => ({ ...tx, date: recurringDateForMonth(tx, month) })),
  ];
  const totalIn  = all.filter(x => x.type === "credit").reduce((s, x) => s + Number(x.amount), 0);
  const totalOut = all.filter(x => x.type === "debit" ).reduce((s, x) => s + Number(x.amount), 0);
  const net      = totalIn - totalOut;

  const handleAnalyze = () => {
    setLoading(true);
    setTimeout(() => {
      const savRate = totalIn > 0 ? Math.round((net / totalIn) * 100) : 0;
      const catMap: Record<string, number> = {};
      all.filter(x => x.type === "debit").forEach(x => {
        catMap[x.category] = (catMap[x.category] || 0) + Number(x.amount);
      });
      const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

      const items = [];
      if (net >= 0) {
        items.push({ type: "tip", title: "Great savings rate!", desc: `You saved ${formatAmount(net, currency.symbol)} — ${savRate}% of income this month.` });
      } else {
        items.push({ type: "warning", title: "Over budget", desc: `You spent ${formatAmount(Math.abs(net), currency.symbol)} more than you earned. Review your expenses.` });
      }
      if (topCat) {
        items.push({ type: "trend", title: "Top spending category", desc: `${topCat[0]} accounts for ${formatAmount(topCat[1], currency.symbol)} of your expenses.` });
      }
      if (transactions.length === 0) {
        items.push({ type: "suggestion", title: "Start tracking!", desc: "Add your first transactions to get personalized insights." });
      } else if (savRate > 20) {
        items.push({ type: "suggestion", title: "Consider investing", desc: `With a ${savRate}% savings rate, you could invest the surplus for better returns.` });
      }

      setInsights(items);
      setExpanded(true);
      setLoading(false);
    }, 900);
  };

  const iconForType = (type: string) => {
    if (type === "tip")        return <span className="text-emerald-500">📈</span>;
    if (type === "warning")    return <span className="text-red-500">📉</span>;
    if (type === "trend")      return <span className="text-blue-500">📊</span>;
    if (type === "suggestion") return <span className="text-amber-500">💡</span>;
    return <span>✨</span>;
  };

  if (!expanded) {
    return (
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{t("aiInsights")}</p>
            <p className="text-xs text-muted-foreground truncate">{t("getSmartAnalysis")}</p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="shrink-0 flex items-center gap-1.5 px-3 h-9 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm active:scale-95 transition-all disabled:opacity-60"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <>{t("analyze")} <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>
            }
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-sm font-semibold text-foreground">{t("aiInsights")}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleAnalyze} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border">{t("refresh")}</button>
          <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      {insights.map((ins, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border hover:bg-accent/30 transition-colors">
          <div className="p-1.5 rounded-md bg-background shrink-0">{iconForType(ins.type)}</div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{ins.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{ins.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Search + Filter ──────────────────────────────────────────

function SearchFilter({
  search, onSearch,
  typeFilter, onTypeFilter,
  categoryFilter, onCategoryFilter,
  sortBy, onSort,
  categories, t,
}: {
  search: string; onSearch: (v: string) => void;
  typeFilter: "all" | "credit" | "debit"; onTypeFilter: (v: "all" | "credit" | "debit") => void;
  categoryFilter: string; onCategoryFilter: (v: string) => void;
  sortBy: "date" | "amount"; onSort: (v: "date" | "amount") => void;
  categories: string[];
  t: ReturnType<typeof getT>;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = [typeFilter !== "all", categoryFilter !== "all", sortBy !== "date"].filter(Boolean).length;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search} onChange={e => onSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-8 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button onClick={() => onSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              <span className="hidden sm:inline">{t("filters")}</span>
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full">
                  {activeCount}
                </Badge>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{t("filters")}</h4>
                {activeCount > 0 && (
                  <button onClick={() => { onTypeFilter("all"); onCategoryFilter("all"); onSort("date"); }}
                    className="text-xs text-primary hover:underline">
                    {t("clearAll")}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("type")}</label>
                <Select value={typeFilter} onValueChange={v => onTypeFilter(v as "all" | "credit" | "debit")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allTypes")}</SelectItem>
                    <SelectItem value="credit">{t("cashIn")}</SelectItem>
                    <SelectItem value="debit">{t("cashOut")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {categories.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("category")}</label>
                  <Select value={categoryFilter} onValueChange={onCategoryFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allCategories")}</SelectItem>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("sortBy")}</label>
                <Select value={sortBy} onValueChange={v => onSort(v as "date" | "amount")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">{t("dateLatest")}</SelectItem>
                    <SelectItem value="amount">{t("amountHighest")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filter badges */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {typeFilter !== "all" && (
            <Badge variant="secondary" className="gap-1 text-[11px] pr-1 cursor-pointer" onClick={() => onTypeFilter("all")}>
              {typeFilter === "credit" ? t("cashIn") : t("cashOut")}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </Badge>
          )}
          {categoryFilter !== "all" && (
            <Badge variant="secondary" className="gap-1 text-[11px] pr-1 cursor-pointer" onClick={() => onCategoryFilter("all")}>
              {categoryFilter}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </Badge>
          )}
          {sortBy !== "date" && (
            <Badge variant="secondary" className="gap-1 text-[11px] pr-1 cursor-pointer" onClick={() => onSort("date")}>
              {t("amountHighest")}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Transaction Item ─────────────────────────────────────────

function TransactionItem({
  tx, onEdit, onDelete, currency, lang, t,
}: {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  currency: Currency;
  lang: FinanceLang;
  t: ReturnType<typeof getT>;
}) {
  const meta      = getCategoryMeta(tx.category);
  const isCredit  = tx.type === "credit";

  return (
    <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border hover:shadow-sm transition-shadow animate-slide-in">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCredit ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-red-50 dark:bg-red-950/40"}`}>
        {isCredit
          ? <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" /></svg>
          : <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" /></svg>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{tx.title}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <span>{fmtDate(tx.date, lang)}</span>
          {tx.category && tx.category !== "Other" && <><span>•</span><span>{meta.icon} {tx.category}</span></>}
          {tx.recurring && <><span>•</span><span className="text-blue-500">↻</span></>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-sm font-semibold ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
          {isCredit ? "+" : "−"}{formatAmount(Number(tx.amount), currency.symbol)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(tx)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(tx.id)} className="text-destructive focus:text-destructive">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Transaction Form Dialog ──────────────────────────────────

function TransactionFormDialog({
  open, onOpenChange, editTx, defaultType,
  onSaved, currency, t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editTx: Transaction | null;
  defaultType: TxType;
  onSaved: (tx: Transaction) => void;
  currency: Currency;
  t: ReturnType<typeof getT>;
}) {
  const [type,       setType]       = useState<TxType>(defaultType);
  const [amount,     setAmount]     = useState("");
  const [title,      setTitle]      = useState("");
  const [category,   setCategory]   = useState("Other");
  const [date,       setDate]       = useState(todayStr());
  const [recurring,  setRecurring]  = useState(false);
  const [recDay,     setRecDay]     = useState(1);
  const [saving,     setSaving]     = useState(false);
  const [showCat,    setShowCat]    = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editTx) {
      setType(editTx.type); setAmount(String(editTx.amount)); setTitle(editTx.title);
      setCategory(editTx.category); setDate(editTx.date); setRecurring(editTx.recurring);
      setRecDay(editTx.recurring_day ?? 1);
    } else {
      setType(defaultType); setAmount(""); setTitle(""); setCategory("Other");
      setDate(todayStr()); setRecurring(false); setRecDay(1);
    }
    setShowCat(false);
    setTimeout(() => amountRef.current?.focus(), 150);
  }, [open, editTx, defaultType]);

  const handleSave = async () => {
    if (!amount || !title.trim()) return;
    setSaving(true);
    const payload: TransactionInsert = {
      title: title.trim(), amount: parseFloat(amount), type, category,
      date, recurring, recurring_day: recurring ? recDay : null, notes: null,
    };
    const res = editTx
      ? await updateTransaction(editTx.id, payload)
      : await createTransaction(payload);
    setSaving(false);
    if (res.data) { onSaved(res.data); onOpenChange(false); }
  };

  const catMeta = getCategoryMeta(category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-semibold">
            {editTx ? t("editEntry") : t("newEntry")}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-5 pb-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setType("credit")}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                type === "credit"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-border hover:border-emerald-300"
              }`}>
              <svg className={`w-5 h-5 ${type === "credit" ? "text-emerald-500" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
              <span className={`font-medium text-sm ${type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {t("cashIn")}
              </span>
            </button>
            <button type="button" onClick={() => setType("debit")}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                type === "debit"
                  ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                  : "border-border hover:border-red-300"
              }`}>
              <svg className={`w-5 h-5 ${type === "debit" ? "text-red-500" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
              </svg>
              <span className={`font-medium text-sm ${type === "debit" ? "text-red-500" : "text-muted-foreground"}`}>
                {t("cashOut")}
              </span>
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t("amount")} ({currency.symbol})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">{currency.symbol}</span>
              <input
                ref={amountRef}
                type="number" step="0.01" min="0.01" inputMode="decimal"
                placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full border border-input rounded-lg pl-9 pr-3 py-2.5 text-lg font-bold text-foreground bg-background placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("description")}</label>
            <textarea
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t("whatWasThisFor")} rows={2}
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm text-foreground bg-background placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("categoryOptional")}</label>
            <button type="button" onClick={() => setShowCat(v => !v)}
              className="w-full flex items-center gap-2 border border-input rounded-lg px-3 py-2.5 bg-background text-sm text-foreground hover:bg-accent transition-colors">
              <span className="text-base">{catMeta.icon}</span>
              <span className="flex-1 text-left">{category}</span>
              <svg className={`w-4 h-4 text-muted-foreground transition-transform ${showCat ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCat && (
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => { setCategory(c.key); setShowCat(false); }}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-medium border transition-all ${
                      category === c.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-accent"
                    }`}>
                    <span className="text-base">{c.icon}</span>
                    <span className="leading-tight text-center">{c.key}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("date")}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Recurring */}
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">{t("recurring")}</p>
              <p className="text-xs text-muted-foreground">{t("repeatMonthly")}</p>
            </div>
            <button type="button" onClick={() => setRecurring(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${recurring ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${recurring ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          {recurring && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t("dayOfMonth")}</label>
              <input type="number" min={1} max={31} value={recDay} onChange={e => setRecDay(Number(e.target.value))}
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSave} disabled={saving || !amount || !title.trim()}
            className={`w-full h-11 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 ${
              type === "credit" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
            }`}>
            {saving
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t("saving")}</span>
              : editTx ? t("updateEntry") : type === "credit" ? t("addCashIn") : t("addCashOut")
            }
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Settings Sheet ───────────────────────────────────────────

function SettingsSheet({
  open, onClose, currency, onCurrencyChange, lang, onLangChange, t,
}: {
  open: boolean; onClose: () => void;
  currency: Currency; onCurrencyChange: (code: string) => void;
  lang: FinanceLang; onLangChange: (l: FinanceLang) => void;
  t: ReturnType<typeof getT>;
}) {
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="left" className="w-[280px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-foreground">{t("finance")}</p>
                <p className="text-xs text-muted-foreground">{t("bookKeeping")}</p>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="flex-1 p-5 space-y-6 overflow-y-auto">
            {/* Currency */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("currency")}</p>
              <Select value={currency.code} onValueChange={onCurrencyChange}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-base">{currency.symbol}</span>
                      <span className="text-muted-foreground">{currency.code}</span>
                      <span className="text-xs text-muted-foreground">— {currency.name}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span className="font-medium w-6">{c.symbol}</span>
                        <span>{c.code}</span>
                        <span className="text-muted-foreground text-xs">— {c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("language")}</p>
              <div className="grid grid-cols-2 gap-2">
                {(["en", "si"] as FinanceLang[]).map(l => (
                  <button key={l} onClick={() => onLangChange(l)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      lang === l
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}>
                    <span>{l === "en" ? "🇬🇧" : "🇱🇰"}</span>
                    <span>{l === "en" ? t("english") : t("sinhala")}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function FinancePage() {
  // Currency + Language (persisted)
  const [currency, setCurrencyState] = useState<Currency>(getSavedCurrency);
  const [lang, setLangState]         = useState<FinanceLang>(getSavedLang);
  const t = useMemo(() => getT(lang), [lang]);

  const changeCurrency = (code: string) => {
    const found = CURRENCIES.find(c => c.code === code);
    if (found) { setCurrencyState(found); saveCurrency(code); }
  };
  const changeLang = (l: FinanceLang) => { setLangState(l); saveLang(l); };

  // Data
  const [month,     setMonth]     = useState(currentMonth);
  const [monthly,   setMonthly]   = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<Transaction[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [missingTable, setMissingTable] = useState(false);

  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [formOpen,     setFormOpen]     = useState(false);
  const [editTx,       setEditTx]       = useState<Transaction | null>(null);
  const [defaultType,  setDefaultType]  = useState<TxType>("credit");
  const [deleteId,     setDeleteId]     = useState<string | null>(null);

  // Filters
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [catFilter,  setCatFilter]  = useState("all");
  const [sortBy,     setSortBy]     = useState<"date" | "amount">("date");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getTransactions(month);
    if (res.error && (res.error === "42P01" || res.error.includes("does not exist"))) {
      setMissingTable(true);
    } else if (res.data) {
      setMonthly(res.data.monthly);
      setRecurring(res.data.recurring);
    }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...monthly];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(tx =>
        tx.title.toLowerCase().includes(q) ||
        String(tx.amount).includes(q) ||
        tx.category?.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") list = list.filter(tx => tx.type === typeFilter);
    if (catFilter  !== "all") list = list.filter(tx => tx.category === catFilter);
    if (sortBy === "amount") list.sort((a, b) => Number(b.amount) - Number(a.amount));
    else                      list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [monthly, search, typeFilter, catFilter, sortBy]);

  const categories = useMemo(() => {
    const cats = new Set(monthly.map(t => t.category).filter(Boolean));
    return Array.from(cats).sort() as string[];
  }, [monthly]);

  const openAdd = (type: TxType) => {
    setEditTx(null); setDefaultType(type); setFormOpen(true);
  };
  const openEdit = (tx: Transaction) => {
    setEditTx(tx); setDefaultType(tx.type); setFormOpen(true);
  };

  const handleSaved = (tx: Transaction) => {
    if (tx.recurring) {
      setRecurring(prev => {
        const idx = prev.findIndex(x => x.id === tx.id);
        return idx >= 0 ? prev.map(x => x.id === tx.id ? tx : x) : [...prev, tx];
      });
    } else {
      setMonthly(prev => {
        const idx = prev.findIndex(x => x.id === tx.id);
        return idx >= 0 ? prev.map(x => x.id === tx.id ? tx : x) : [tx, ...prev];
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    await deleteTransaction(deleteId);
    setMonthly(prev  => prev.filter(x => x.id !== deleteId));
    setRecurring(prev => prev.filter(x => x.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-card border-b border-border shadow-sm px-4 pt-safe-top">
        <div className="flex items-center justify-between h-14">
          {/* Hamburger + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <span className="font-bold text-foreground">{t("finance")}</span>
            </div>
          </div>

          {/* Currency badge */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 h-9 px-3 bg-muted border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <span className="font-bold text-base">{currency.symbol}</span>
            <span className="text-muted-foreground">{currency.code}</span>
            <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-between py-2.5">
          <button onClick={() => setMonth(prevMonth(month))}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setMonth(currentMonth())}
            className="flex items-center gap-2 px-4 h-9 rounded-lg bg-card border border-border font-semibold text-sm text-foreground hover:bg-accent transition-colors"
          >
            {monthLabel(month, lang)}
          </button>
          <button onClick={() => setMonth(nextMonth(month))}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Scrollable Body ─────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-28">

        {/* Missing table banner */}
        {missingTable && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">⚙️ {t("setupRequired")}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Run <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">supabase/migrations/003_finance_tracker.sql</code> in Supabase SQL Editor.
            </p>
          </div>
        )}

        {/* Balance Cards */}
        <BalanceCards monthly={monthly} recurring={recurring} month={month} currency={currency} t={t} />

        {/* AI Insights */}
        <AIInsights transactions={monthly} recurring={recurring} month={month} currency={currency} t={t} />

        {/* Search + Filter */}
        <SearchFilter
          search={search} onSearch={setSearch}
          typeFilter={typeFilter} onTypeFilter={setTypeFilter}
          categoryFilter={catFilter} onCategoryFilter={setCatFilter}
          sortBy={sortBy} onSort={setSortBy}
          categories={categories} t={t}
        />

        {/* Entries */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">{t("entries")}</h2>
            {filtered.length > 0 && (
              <span className="text-xs text-muted-foreground">{filtered.length} {t("transactions")}</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-card border border-border rounded-xl">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center text-3xl mb-3">📋</div>
              <p className="text-sm font-semibold text-foreground mb-1">{t("noEntriesYet")}</p>
              <p className="text-xs text-muted-foreground px-8">{t("startAdding")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(tx => (
                <TransactionItem
                  key={tx.id} tx={tx}
                  onEdit={openEdit} onDelete={setDeleteId}
                  currency={currency} lang={lang} t={t}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Fixed Bottom: Cash In / Cash Out ────────────────────── */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+60px)] left-0 right-0 z-20 bg-card/80 backdrop-blur-md border-t border-border px-4 py-3">
        <div className="flex gap-3">
          <button onClick={() => openAdd("credit")}
            className="flex-1 flex items-center justify-center gap-2 h-11 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl shadow-sm active:scale-[0.98] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {t("cashIn")}
          </button>
          <button onClick={() => openAdd("debit")}
            className="flex-1 flex items-center justify-center gap-2 h-11 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl shadow-sm active:scale-[0.98] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
            </svg>
            {t("cashOut")}
          </button>
        </div>
      </div>

      {/* ── Dialogs + Sheets ────────────────────────────────────── */}
      <SettingsSheet
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        currency={currency} onCurrencyChange={changeCurrency}
        lang={lang} onLangChange={changeLang} t={t}
      />

      <TransactionFormDialog
        open={formOpen} onOpenChange={setFormOpen}
        editTx={editTx} defaultType={defaultType}
        onSaved={handleSaved} currency={currency} t={t}
      />

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteEntry")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
