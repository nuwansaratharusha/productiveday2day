// =============================================================
// ProductiveDay — Finance Tracker
// UI pixel-matched to Figma (CashBook design)
// Colors, typography, spacing extracted directly from Figma
// =============================================================

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Download, FileText, FileSpreadsheet, Lightbulb, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { IconByKey } from "@/lib/categoryIcons";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Figma Design Tokens ─────────────────────────────────────
const FG = {
  pageBg:          "#f8f9fa",
  cardBg:          "#ffffff",
  cardBorder:      "#e3e6ea",
  headerBg:        "#fefefe",
  headerBorder:    "#e3e5ea",
  sidebarBg:       "#fefefe",
  sidebarDivider:  "#e9eaee",
  sectionLabel:    "#babdc2",
  navText:         "#9498a0",
  navTextActive:   "#858890",
  navActiveBg:     "#f1f2f4",
  amountGreen:     "#52be8b",
  amountRed:       "#e35758",
  labelMuted:      "#a7abb4",
  labelMuted2:     "#b1b5be",
  textPrimary:     "#62656d",
  textSecondary:   "#6c7178",
  aiBg:            "#f1f4fc",
  aiBorder:        "#dae2f6",
  aiTitle:         "#6c7178",
  aiSubtitle:      "#b1b5be",
  analyzeBg:       "#2761d8",
  analyzeBorder:   "#1250d9",
  analyzeText:     "#9eb6ec",
  searchBg:        "#f8f9fa",
  searchBorder:    "#e2e5ea",
  filterBg:        "#fefefe",
  filterBorder:    "#d9d8de",
  filterText:      "#83868d",
  monthBg:         "#fefefe",
  monthBorder:     "#e9eaee",
  monthText:       "#62666d",
  currencyBg:      "#fdfcfd",
  currencyBorder:  "#d3d4db",
  currencyText:    "#a9adb6",
  entriesLabel:    "#62656d",
  emptyTitle:      "#808389",
  emptySubtitle:   "#acb0b9",
  userBg:          "#f2f3f5",
  userText:        "#8c909a",
  userInitialsBg:  "#acc0ef",
  txDescText:      "#3a3d44",
  txMetaText:      "#9a9da6",
} as const;

// ─── Helpers ──────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split("T")[0]; }

function fmtDateLong(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Report Export Helpers ────────────────────────────────────

function buildAllTxForMonth(monthly: Transaction[], recurring: Transaction[], month: string): Transaction[] {
  return [
    ...monthly,
    ...recurring.map(tx => ({ ...tx, date: recurringDateForMonth(tx, month) })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

function downloadCSV(monthly: Transaction[], recurring: Transaction[], month: string, currency: { symbol: string; code: string }) {
  const all = buildAllTxForMonth(monthly, recurring, month);
  const totalIn  = all.filter(x => x.type === "credit").reduce((s, x) => s + Number(x.amount), 0);
  const totalOut = all.filter(x => x.type === "debit" ).reduce((s, x) => s + Number(x.amount), 0);
  const net      = totalIn - totalOut;

  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

  const rows: string[] = [
    `"ProductiveDay Finance Report — ${monthLabel(month)}"`,
    `"Currency: ${currency.code} (${currency.symbol})"`,
    `"Generated: ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}"`,
    "",
    [esc("Date"), esc("Type"), esc("Description"), esc("Category"), esc(`Amount (${currency.code})`), esc("Recurring")].join(","),
    ...all.map(tx => [
      esc(tx.date),
      esc(tx.type === "credit" ? "Cash In" : "Cash Out"),
      esc(tx.title),
      esc(tx.category || "Uncategorised"),
      esc(Number(tx.amount).toFixed(2)),
      esc(tx.recurring ? "Yes" : "No"),
    ].join(",")),
    "",
    `"── Summary ──"`,
    [esc("Cash In"),    esc(totalIn.toFixed(2))].join(","),
    [esc("Cash Out"),   esc(totalOut.toFixed(2))].join(","),
    [esc("Net Balance"),esc(net.toFixed(2))].join(","),
  ];

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `finance-report-${month}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printHTMLReport(monthly: Transaction[], recurring: Transaction[], month: string, currency: { symbol: string; code: string; name: string }) {
  const all      = buildAllTxForMonth(monthly, recurring, month);
  const totalIn  = all.filter(x => x.type === "credit").reduce((s, x) => s + Number(x.amount), 0);
  const totalOut = all.filter(x => x.type === "debit" ).reduce((s, x) => s + Number(x.amount), 0);
  const net      = totalIn - totalOut;

  // Category breakdown
  const catMap: Record<string, { in: number; out: number; count: number }> = {};
  all.forEach(tx => {
    const c = tx.category || "Uncategorised";
    if (!catMap[c]) catMap[c] = { in: 0, out: 0, count: 0 };
    catMap[c].count++;
    if (tx.type === "credit") catMap[c].in  += Number(tx.amount);
    else                      catMap[c].out += Number(tx.amount);
  });
  const catRows = Object.entries(catMap).sort((a, b) => (b[1].out + b[1].in) - (a[1].out + a[1].in));

  const fmt = (n: number) => `${currency.symbol}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const colour = (n: number) => n >= 0 ? "#16a34a" : "#dc2626";

  const txRows = all.map(tx => `
    <tr>
      <td>${tx.date}</td>
      <td><span class="${tx.type === "credit" ? "badge-in" : "badge-out"}">${tx.type === "credit" ? "Cash In" : "Cash Out"}</span></td>
      <td class="desc">${tx.title}</td>
      <td>${tx.category || "Uncategorised"}</td>
      <td class="amount" style="color:${tx.type === "credit" ? "#16a34a" : "#dc2626"}">${tx.type === "credit" ? "+" : "−"}${fmt(Number(tx.amount))}</td>
    </tr>`).join("");

  const catTableRows = catRows.map(([cat, v]) => `
    <tr>
      <td>${cat}</td>
      <td>${v.count}</td>
      <td style="color:#16a34a">${v.in > 0 ? "+" + fmt(v.in) : "—"}</td>
      <td style="color:#dc2626">${v.out > 0 ? "−" + fmt(v.out) : "—"}</td>
      <td style="color:${colour(v.in - v.out)};font-weight:600">${fmt(v.in - v.out)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Finance Report — ${monthLabel(month)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Inter", "Segoe UI", sans-serif; color: #1e1e2e; background: #fff; padding: 32px; font-size: 13px; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon { width: 36px; height: 36px; background: #2761d8; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .logo-text { font-size: 18px; font-weight: 700; color: #1e1e2e; }
  .report-meta { text-align: right; color: #64748b; font-size: 11px; line-height: 1.6; }
  .report-meta strong { color: #1e1e2e; font-size: 14px; font-weight: 700; display: block; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
  .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
  .card-label { font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
  .card-value { font-size: 22px; font-weight: 700; }
  .section-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  th { background: #f8fafc; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; border-bottom: 1px solid #e2e8f0; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
  tr:last-child td { border-bottom: none; }
  .desc { max-width: 220px; color: #334155; }
  .amount { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .badge-in  { display: inline-block; background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
  .badge-out { display: inline-block; background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
  @media print { body { padding: 16px; } @page { margin: 15mm; } }
</style>
</head>
<body>

<div class="header">
  <div class="logo">
    <div class="logo-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M5 7h14M5 11h10M5 15h12M5 19h8" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </div>
    <span class="logo-text">ProductiveDay Finance</span>
  </div>
  <div class="report-meta">
    <strong>${monthLabel(month)}</strong>
    Currency: ${currency.name} (${currency.code})<br>
    Generated: ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
  </div>
</div>

<div class="summary">
  <div class="card">
    <div class="card-label">Net Balance</div>
    <div class="card-value" style="color:${colour(net)}">${fmt(Math.abs(net))}</div>
  </div>
  <div class="card">
    <div class="card-label">Total Cash In</div>
    <div class="card-value" style="color:#16a34a">${fmt(totalIn)}</div>
  </div>
  <div class="card">
    <div class="card-label">Total Cash Out</div>
    <div class="card-value" style="color:#dc2626">${fmt(totalOut)}</div>
  </div>
</div>

${catRows.length > 0 ? `
<div class="section-title">Category Breakdown</div>
<table>
  <thead><tr><th>Category</th><th>Transactions</th><th>Income</th><th>Expense</th><th>Net</th></tr></thead>
  <tbody>${catTableRows}</tbody>
</table>` : ""}

<div class="section-title">Transactions (${all.length})</div>
<table>
  <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
  <tbody>${txRows}</tbody>
</table>

<div class="footer">ProductiveDay · Finance Report · ${monthLabel(month)}</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }
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
// Matches Figma: white bg, #e3e6ea border, 6px radius, icons top-right
// Amount: #52be8b (green) or #e35758 (red), label: #a7abb4

function BalanceCards({ monthly, recurring, month, currency, t }: {
  monthly: Transaction[]; recurring: Transaction[];
  month: string; currency: Currency; t: ReturnType<typeof getT>;
}) {
  const all = [
    ...monthly,
    ...recurring.map(tx => ({ ...tx, date: recurringDateForMonth(tx, month) })),
  ];
  const totalIn  = all.filter(x => x.type === "credit").reduce((s, x) => s + Number(x.amount), 0);
  const totalOut = all.filter(x => x.type === "debit" ).reduce((s, x) => s + Number(x.amount), 0);
  const net      = totalIn - totalOut;

  const cards = [
    {
      label: t("netBalance"),
      amount: net,
      color: net >= 0 ? FG.amountGreen : FG.amountRed,
      icon: (
        // Wallet icon — matches Figma (blue-ish wallet)
        <svg width="17" height="16" viewBox="0 0 20 18" fill="none">
          <rect x="1" y="4" width="18" height="13" rx="2" stroke="#6B8FD8" strokeWidth="1.5"/>
          <path d="M1 8h18" stroke="#6B8FD8" strokeWidth="1.5"/>
          <circle cx="15" cy="12" r="1.5" fill="#6B8FD8"/>
          <path d="M5 1h10" stroke="#6B8FD8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: t("totalCashIn"),
      amount: totalIn,
      color: FG.amountGreen,
      icon: (
        // Arrow up circle — green, matches Figma
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#52be8b" strokeWidth="1.5"/>
          <path d="M10 13V7M7 10l3-3 3 3" stroke="#52be8b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: t("totalCashOut"),
      amount: totalOut,
      color: FG.amountRed,
      icon: (
        // Arrow down circle — red, matches Figma
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#e35758" strokeWidth="1.5"/>
          <path d="M10 7v6M13 10l-3 3-3-3" stroke="#e35758" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];

  return (
    // Mobile: Net balance full-width + In/Out two-col | Desktop (≥640): 3-col
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {cards.map((c, i) => (
        <div
          key={c.label}
          style={{ background: FG.cardBg, border: `1px solid ${FG.cardBorder}`, borderRadius: 8 }}
          className={cn(
            "p-3 sm:p-4 min-w-0",
            // Net Balance spans full width on mobile, then 1 col from sm breakpoint
            i === 0 ? "col-span-2 sm:col-span-1" : "col-span-1"
          )}
        >
          <div className="flex items-center justify-between mb-2 gap-2">
            <span
              style={{ color: FG.labelMuted, fontWeight: 500 }}
              className="leading-tight text-[11px] truncate"
            >
              {c.label}
            </span>
            <span className="flex-shrink-0">{c.icon}</span>
          </div>
          <p
            style={{ color: c.color, fontWeight: 600, fontFamily: "Inter, sans-serif" }}
            className={cn(
              "leading-tight truncate",
              i === 0 ? "text-[22px] sm:text-[20px]" : "text-[16px] sm:text-[20px]"
            )}
          >
            {c.label === t("netBalance") && net < 0 ? "−" : ""}
            {formatAmount(Math.abs(c.amount), currency.symbol)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── AI Insights Card ─────────────────────────────────────────
// Figma: bg #f1f4fc, border 2px #dae2f6, Analyze btn #2761d8

function AIInsightsCard({ monthly, recurring, month, currency, t }: {
  monthly: Transaction[]; recurring: Transaction[];
  month: string; currency: Currency; t: ReturnType<typeof getT>;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [insights,  setInsights]  = useState<{ title: string; desc: string; icon: string }[]>([]);

  const all = [
    ...monthly,
    ...recurring.map(tx => ({ ...tx, date: recurringDateForMonth(tx, month) })),
  ];
  const totalIn  = all.filter(x => x.type === "credit").reduce((s, x) => s + Number(x.amount), 0);
  const totalOut = all.filter(x => x.type === "debit" ).reduce((s, x) => s + Number(x.amount), 0);
  const net      = totalIn - totalOut;

  const handleAnalyze = () => {
    setLoading(true);
    setTimeout(() => {
      const rate = totalIn > 0 ? Math.round((net / totalIn) * 100) : 0;
      const catMap: Record<string, number> = {};
      all.filter(x => x.type === "debit").forEach(x => {
        catMap[x.category] = (catMap[x.category] || 0) + Number(x.amount);
      });
      const top = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
      const items = [];
      if (all.length === 0) {
        items.push({ icon: "tip",   title: "Start tracking", desc: "Add your first transactions to get personalised financial insights." });
      } else if (net >= 0) {
        items.push({ icon: "up",    title: `${rate}% savings rate`, desc: `You saved ${formatAmount(net, currency.symbol)} this month. Keep it up!` });
      } else {
        items.push({ icon: "down",  title: "Over budget", desc: `You spent ${formatAmount(Math.abs(net), currency.symbol)} more than you earned. Consider cutting back.` });
      }
      if (top) items.push({ icon: "chart",  title: "Top spending", desc: `${top[0]} is your biggest expense at ${formatAmount(top[1], currency.symbol)}.` });
      if (rate > 20 && net > 0) items.push({ icon: "tip", title: "Invest surplus", desc: `With a ${rate}% savings rate, consider putting the surplus to work.` });
      setInsights(items);
      setExpanded(true);
      setLoading(false);
    }, 900);
  };

  return (
    <div style={{
      background: FG.aiBg,
      border: `2px solid ${FG.aiBorder}`,
      borderRadius: 6,
      padding: "12px 16px",
    }}>
      <div className="flex items-center gap-3">
        {/* Figma AI icon — sparkle/lightning in a small circle */}
        <div style={{
          width: 28, height: 28, borderRadius: 6, background: "rgba(39,97,216,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.5 6.5H15L10.5 9.5L12 15L8 12L4 15L5.5 9.5L1 6.5H6.5L8 1Z"
              fill="#2761d8" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p style={{ color: FG.aiTitle, fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>
            {t("aiInsights")}
          </p>
          {!expanded && (
            <p style={{ color: FG.aiSubtitle, fontSize: 10, fontWeight: 400 }}>
              {t("getSmartAnalysis")}
            </p>
          )}
        </div>

        {!expanded ? (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              background: FG.analyzeBg,
              border: `1px solid ${FG.analyzeBorder}`,
              borderRadius: 7,
              padding: "6px 12px",
              display: "flex", alignItems: "center", gap: 6,
              flexShrink: 0,
            }}
          >
            {loading
              ? <span style={{ width: 12, height: 12, border: "2px solid rgba(158,182,236,0.3)", borderTopColor: "#9eb6ec", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              : <>
                  <span style={{ color: FG.analyzeText, fontSize: 11, fontWeight: 400 }}>{t("analyze")}</span>
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5h6M5 2l3 3-3 3" stroke="#9eb6ec" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
            }
          </button>
        ) : (
          <button onClick={() => setExpanded(false)} style={{ color: FG.aiSubtitle, fontSize: 16, lineHeight: 1 }}>×</button>
        )}
      </div>

      {expanded && insights.length > 0 && (
        <div className="mt-3 space-y-2">
          {insights.map((ins, i) => (
            <div key={i} style={{
              background: FG.cardBg, border: `1px solid ${FG.cardBorder}`, borderRadius: 6, padding: "10px 12px",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              {(() => {
                const iconMap: Record<string, React.ReactNode> = {
                  tip:   <Lightbulb  style={{ width: 14, height: 14, color: "#f59e0b", flexShrink: 0 }} strokeWidth={1.75} />,
                  up:    <TrendingUp style={{ width: 14, height: 14, color: "#10b981", flexShrink: 0 }} strokeWidth={1.75} />,
                  down:  <TrendingDown style={{ width: 14, height: 14, color: "#f43f5e", flexShrink: 0 }} strokeWidth={1.75} />,
                  chart: <BarChart2  style={{ width: 14, height: 14, color: "#6366f1", flexShrink: 0 }} strokeWidth={1.75} />,
                };
                return iconMap[ins.icon] ?? <Lightbulb style={{ width: 14, height: 14, flexShrink: 0 }} strokeWidth={1.75} />;
              })()}
              <div>
                <p style={{ color: FG.textPrimary, fontSize: 11, fontWeight: 600 }}>{ins.title}</p>
                <p style={{ color: FG.labelMuted, fontSize: 10, marginTop: 2 }}>{ins.desc}</p>
              </div>
            </div>
          ))}
          <button
            onClick={handleAnalyze}
            style={{ color: FG.analyzeBg, fontSize: 10, fontWeight: 500, marginTop: 4 }}
          >
            {t("refresh")} ↺
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Search + Filter ──────────────────────────────────────────
// Figma: search bg #f8f9fa, border #e2e5ea | filter btn bg #fefefe, border #d9d8de

function SearchFilterBar({ search, onSearch, typeFilter, onTypeFilter, catFilter, onCatFilter,
  sortBy, onSort, categories, t }: {
  search: string; onSearch: (v: string) => void;
  typeFilter: "all" | "credit" | "debit"; onTypeFilter: (v: "all" | "credit" | "debit") => void;
  catFilter: string; onCatFilter: (v: string) => void;
  sortBy: "date" | "amount"; onSort: (v: "date" | "amount") => void;
  categories: string[]; t: ReturnType<typeof getT>;
}) {
  const [open, setOpen] = useState(false);
  const active = [typeFilter !== "all", catFilter !== "all", sortBy !== "date"].filter(Boolean).length;

  return (
    <div style={{ display: "flex", gap: 8, width: "100%", minWidth: 0 }}>
      {/* Search — mobile-optimised height + padding */}
      <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          width="13" height="13" viewBox="0 0 12 12" fill="none">
          <circle cx="5" cy="5" r="4" stroke="#afb3bb" strokeWidth="1.3"/>
          <path d="M8.5 8.5L11 11" stroke="#afb3bb" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          value={search} onChange={e => onSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          style={{
            width: "100%", background: FG.searchBg, border: `1px solid ${FG.searchBorder}`,
            borderRadius: 8, padding: "10px 34px 10px 32px",
            color: FG.textPrimary,
            outline: "none", boxSizing: "border-box",
            minHeight: 40,
          }}
          onFocus={e => e.target.style.borderColor = "#2761d8"}
          onBlur={e => e.target.style.borderColor = FG.searchBorder}
        />
        {search && (
          <button onClick={() => onSearch("")}
            aria-label="Clear"
            style={{
              position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
              color: FG.labelMuted, width: 24, height: 24, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", background: "transparent", fontSize: 18, lineHeight: 1,
            }}>
            ×
          </button>
        )}
      </div>

      {/* Filters button — larger tap target, keeps Figma colors */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button style={{
            background: FG.filterBg, border: `1px solid ${FG.filterBorder}`,
            borderRadius: 8, padding: "0 14px",
            display: "flex", alignItems: "center", gap: 6,
            minHeight: 40, flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
              <path d="M1 3h10M3 6h6M5 9h2" stroke={FG.filterText} strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span style={{ color: FG.filterText, fontSize: 12, fontWeight: 500 }}>{t("filters")}</span>
            {active > 0 && (
              <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[9px] flex items-center justify-center rounded-full">
                {active}
              </Badge>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span style={{ color: FG.textPrimary, fontSize: 12, fontWeight: 600 }}>{t("filters")}</span>
              {active > 0 && (
                <button onClick={() => { onTypeFilter("all"); onCatFilter("all"); onSort("date"); }}
                  style={{ color: FG.analyzeBg, fontSize: 11 }}>{t("clearAll")}</button>
              )}
            </div>
            <div className="space-y-1">
              <label style={{ color: FG.sectionLabel, fontSize: 10, fontWeight: 600 }}>{t("type")}</label>
              <Select value={typeFilter} onValueChange={v => onTypeFilter(v as "all" | "credit" | "debit")}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTypes")}</SelectItem>
                  <SelectItem value="credit">{t("cashIn")}</SelectItem>
                  <SelectItem value="debit">{t("cashOut")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {categories.length > 0 && (
              <div className="space-y-1">
                <label style={{ color: FG.sectionLabel, fontSize: 10, fontWeight: 600 }}>{t("category")}</label>
                <Select value={catFilter} onValueChange={onCatFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allCategories")}</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <label style={{ color: FG.sectionLabel, fontSize: 10, fontWeight: 600 }}>{t("sortBy")}</label>
              <Select value={sortBy} onValueChange={v => onSort(v as "date" | "amount")}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
  );
}

// ─── Transaction Row ──────────────────────────────────────────
// Figma: white card, border #e3e6ea, radius 6, arrow icon in circle bg

function TxRow({ tx, onEdit, onDelete, currency }: {
  tx: Transaction; onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void; currency: Currency;
}) {
  const isCredit = tx.type === "credit";
  const meta = getCategoryMeta(tx.category);

  return (
    <div style={{
      background: FG.cardBg, border: `1px solid ${FG.cardBorder}`,
      borderRadius: 6, padding: "12px 14px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      {/* Arrow icon in circle */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: isCredit ? "rgba(82,190,139,0.12)" : "rgba(227,87,88,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isCredit
          ? <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke={FG.amountGreen} strokeWidth="1.5"/>
              <path d="M10 13V7M7 10l3-3 3 3" stroke={FG.amountGreen} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          : <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke={FG.amountRed} strokeWidth="1.5"/>
              <path d="M10 7v6M13 10l-3 3-3-3" stroke={FG.amountRed} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        }
      </div>

      {/* Description + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: FG.txDescText, fontSize: 12, fontWeight: 500 }} className="truncate">
          {tx.title}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{ color: FG.txMetaText, fontSize: 10 }}>{fmtDateLong(tx.date)}</span>
          {tx.category && tx.category !== "Other" && (
            <>
              <span style={{ color: FG.txMetaText, fontSize: 10 }}>•</span>
              <span style={{ color: FG.txMetaText, fontSize: 10, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <IconByKey iconKey={meta.icon} className="w-2.5 h-2.5" strokeWidth={2} />
                {tx.category}
              </span>
            </>
          )}
          {tx.recurring && (
            <>
              <span style={{ color: FG.txMetaText, fontSize: 10 }}>•</span>
              <span style={{ color: "#6B8FD8", fontSize: 10 }}>↻ Recurring</span>
            </>
          )}
        </div>
      </div>

      {/* Amount + menu */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ color: isCredit ? FG.amountGreen : FG.amountRed, fontSize: 13, fontWeight: 600 }}>
          {isCredit ? "+" : "−"}{formatAmount(Number(tx.amount), currency.symbol)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button style={{
              width: 28, height: 28, borderRadius: 6, border: `1px solid ${FG.cardBorder}`,
              background: FG.cardBg, display: "flex", alignItems: "center", justifyContent: "center",
              color: FG.navText,
            }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/>
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={() => onEdit(tx)}>
              <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(tx.id)} className="text-destructive focus:text-destructive">
              <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Transaction Form Dialog ──────────────────────────────────

function TxFormDialog({ open, onOpenChange, editTx, defaultType, onSaved, currency, t }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editTx: Transaction | null; defaultType: TxType;
  onSaved: (tx: Transaction) => void; currency: Currency; t: ReturnType<typeof getT>;
}) {
  const [type,      setType]      = useState<TxType>(defaultType);
  const [amount,    setAmount]    = useState("");
  const [title,     setTitle]     = useState("");
  const [category,  setCategory]  = useState("Other");
  const [date,      setDate]      = useState(todayStr());
  const [recurring, setRecurring] = useState(false);
  const [recDay,    setRecDay]    = useState(1);
  const [saving,    setSaving]    = useState(false);
  const [showCat,   setShowCat]   = useState(false);
  const amtRef = useRef<HTMLInputElement>(null);

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
    setTimeout(() => amtRef.current?.focus(), 150);
  }, [open, editTx, defaultType]);

  const handleSave = async () => {
    if (!amount || !title.trim()) return;
    setSaving(true);
    const payload: TransactionInsert = {
      title: title.trim(), amount: parseFloat(amount), type,
      category, date, recurring,
      recurring_day: recurring ? recDay : null, notes: null,
    };
    const res = editTx
      ? await updateTransaction(editTx.id, payload)
      : await createTransaction(payload);
    setSaving(false);
    if (res.data) { onSaved(res.data); onOpenChange(false); }
  };

  const catMeta = getCategoryMeta(category);
  const isCredit = type === "credit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-xl">
        <DialogHeader className="px-6 pt-5 pb-3 border-b" style={{ borderColor: FG.cardBorder }}>
          <DialogTitle style={{ color: FG.textPrimary, fontSize: 16, fontWeight: 600 }}>
            {editTx ? t("editEntry") : t("newEntry")}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Type toggle — Figma style: border highlight */}
          <div className="grid grid-cols-2 gap-3">
            {(["credit", "debit"] as TxType[]).map(tp => (
              <button key={tp} onClick={() => setType(tp)}
                style={{
                  padding: "12px 8px",
                  borderRadius: 8,
                  border: `2px solid ${type === tp
                    ? tp === "credit" ? FG.amountGreen : FG.amountRed
                    : FG.cardBorder}`,
                  background: type === tp
                    ? tp === "credit" ? "rgba(82,190,139,0.08)" : "rgba(227,87,88,0.08)"
                    : FG.cardBg,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.15s",
                }}>
                {tp === "credit"
                  ? <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke={type === "credit" ? FG.amountGreen : FG.labelMuted} strokeWidth="1.5"/>
                      <path d="M10 13V7M7 10l3-3 3 3" stroke={type === "credit" ? FG.amountGreen : FG.labelMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  : <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke={type === "debit" ? FG.amountRed : FG.labelMuted} strokeWidth="1.5"/>
                      <path d="M10 7v6M13 10l-3 3-3-3" stroke={type === "debit" ? FG.amountRed : FG.labelMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                }
                <span style={{
                  color: type === tp
                    ? tp === "credit" ? FG.amountGreen : FG.amountRed
                    : FG.labelMuted,
                  fontSize: 12, fontWeight: 500,
                }}>
                  {tp === "credit" ? t("cashIn") : t("cashOut")}
                </span>
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label style={{ color: FG.textSecondary, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 6 }}>
              {t("amount")} ({currency.symbol})
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: FG.labelMuted, fontWeight: 600, fontSize: 14 }}>
                {currency.symbol}
              </span>
              <input ref={amtRef} type="number" step="0.01" min="0.01" inputMode="decimal"
                placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                style={{
                  width: "100%", border: `1px solid ${FG.cardBorder}`, borderRadius: 6,
                  paddingLeft: 28, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                  fontSize: 18, fontWeight: 700, color: isCredit ? FG.amountGreen : FG.amountRed,
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "#2761d8"}
                onBlur={e => e.target.style.borderColor = FG.cardBorder}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ color: FG.textSecondary, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 6 }}>
              {t("description")}
            </label>
            <textarea value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t("whatWasThisFor")} rows={2}
              style={{
                width: "100%", border: `1px solid ${FG.cardBorder}`, borderRadius: 6,
                padding: "10px 12px", fontSize: 12, color: FG.txDescText,
                outline: "none", resize: "none", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "#2761d8"}
              onBlur={e => e.target.style.borderColor = FG.cardBorder}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ color: FG.textSecondary, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 6 }}>
              {t("categoryOptional")}
            </label>
            <button onClick={() => setShowCat(v => !v)}
              style={{
                width: "100%", border: `1px solid ${FG.cardBorder}`, borderRadius: 6,
                padding: "9px 12px", background: FG.cardBg,
                display: "flex", alignItems: "center", gap: 8, boxSizing: "border-box",
              }}>
              <IconByKey iconKey={catMeta.icon} className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span style={{ flex: 1, textAlign: "left", fontSize: 12, color: FG.txDescText }}>{category}</span>
              <svg style={{ transform: showCat ? "rotate(180deg)" : "none", transition: "0.15s" }}
                width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke={FG.labelMuted} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
            {showCat && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 8 }}>
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => { setCategory(c.key); setShowCat(false); }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      padding: "8px 4px", borderRadius: 6, fontSize: 9, fontWeight: 500,
                      border: `1px solid ${category === c.key ? "#2761d8" : FG.cardBorder}`,
                      background: category === c.key ? "rgba(39,97,216,0.08)" : FG.cardBg,
                      color: category === c.key ? "#2761d8" : FG.navText,
                      cursor: "pointer",
                    }}>
                    <IconByKey iconKey={c.icon} className="w-4 h-4" strokeWidth={1.75} />
                    <span style={{ lineHeight: 1.2, textAlign: "center" }}>{c.key}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label style={{ color: FG.textSecondary, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 6 }}>
              {t("date")}
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{
                width: "100%", border: `1px solid ${FG.cardBorder}`, borderRadius: 6,
                padding: "9px 12px", fontSize: 12, color: FG.txDescText,
                outline: "none", boxSizing: "border-box",
              }} />
          </div>

          {/* Recurring */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 12px", background: FG.searchBg, borderRadius: 6, border: `1px solid ${FG.cardBorder}`,
          }}>
            <div>
              <p style={{ color: FG.txDescText, fontSize: 12, fontWeight: 500 }}>{t("recurring")}</p>
              <p style={{ color: FG.labelMuted, fontSize: 10, marginTop: 2 }}>{t("repeatMonthly")}</p>
            </div>
            <button onClick={() => setRecurring(v => !v)}
              style={{
                width: 42, height: 24, borderRadius: 12, transition: "background 0.15s",
                background: recurring ? FG.analyzeBg : FG.cardBorder,
                position: "relative", flexShrink: 0, border: "none",
              }}>
              <span style={{
                position: "absolute", top: 2, width: 20, height: 20, borderRadius: 10,
                background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "transform 0.15s",
                transform: recurring ? "translateX(20px)" : "translateX(2px)",
              }} />
            </button>
          </div>
          {recurring && (
            <div>
              <label style={{ color: FG.textSecondary, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 6 }}>
                {t("dayOfMonth")}
              </label>
              <input type="number" min={1} max={31} value={recDay} onChange={e => setRecDay(Number(e.target.value))}
                style={{
                  width: "100%", border: `1px solid ${FG.cardBorder}`, borderRadius: 6,
                  padding: "9px 12px", fontSize: 12, color: FG.txDescText, outline: "none", boxSizing: "border-box",
                }} />
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSave} disabled={saving || !amount || !title.trim()}
            style={{
              width: "100%", height: 42, borderRadius: 8, border: "none",
              background: isCredit ? FG.amountGreen : FG.amountRed,
              color: "#fff", fontSize: 13, fontWeight: 600,
              opacity: (saving || !amount || !title.trim()) ? 0.5 : 1,
              cursor: (saving || !amount || !title.trim()) ? "not-allowed" : "pointer",
            }}>
            {saving ? t("saving") : editTx ? t("updateEntry") : isCredit ? t("addCashIn") : t("addCashOut")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Left Sidebar Sheet ───────────────────────────────────────
// Matches Figma sidebar: logo, Book Keeping > Dashboard/Reports,
// AI Features > AI/Smart Insights, Others > Settings/Help, Language, User

function SidebarSheet({ open, onClose, currency, onCurrencyChange, lang, onLangChange, t }: {
  open: boolean; onClose: () => void;
  currency: Currency; onCurrencyChange: (code: string) => void;
  lang: FinanceLang; onLangChange: (l: FinanceLang) => void;
  t: ReturnType<typeof getT>;
}) {
  const NavItem = ({ label, icon, active = false }: { label: string; icon: React.ReactNode; active?: boolean }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
      borderRadius: 4, background: active ? FG.navActiveBg : "transparent",
      cursor: "pointer",
    }}>
      <span style={{ color: active ? FG.navTextActive : FG.navText, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: active ? FG.navTextActive : FG.navText, fontSize: 10, fontWeight: 400 }}>{label}</span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="left" className="p-0 w-[220px]" style={{ background: FG.sidebarBg }}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>

          {/* Logo — matches Figma: book icon + CashBook text */}
          <div style={{ padding: "14px 16px 12px", borderBottom: `5px solid ${FG.navActiveBg}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 27, height: 28, flexShrink: 0 }}>
                <svg viewBox="0 0 27 28" fill="none" width="27" height="28">
                  <rect width="27" height="28" rx="4" fill="#2761d8"/>
                  <path d="M7 8h13M7 12h9M7 16h11M7 20h7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ color: FG.textSecondary, fontSize: 13, fontWeight: 600 }}>
                {t("finance")}
              </span>
            </div>
          </div>

          {/* Nav sections */}
          <div style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>

            {/* Book Keeping */}
            <p style={{ color: FG.sectionLabel, fontSize: 9, fontWeight: 600, padding: "0 8px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("bookKeeping")}
            </p>
            <NavItem active label="Dashboard" icon={
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            } />
            <NavItem label="Reports" icon={
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 12V5l4-4 4 4v7H8V9H6v3H2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
            } />

            <div style={{ height: 1, background: FG.sidebarDivider, margin: "10px 0" }} />

            {/* AI Features */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 6px" }}>
              <p style={{ color: FG.sectionLabel, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                AI Features
              </p>
              <span style={{
                background: "#dde9f9", color: "#7399de", fontSize: 7, fontWeight: 600,
                padding: "2px 6px", borderRadius: 8,
              }}>New</span>
            </div>
            <NavItem label="AI Features" icon={
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M7 1L8.5 5.5H13L9.5 8L11 12.5L7 10L3 12.5L4.5 8L1 5.5H5.5L7 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>
            } />
            <NavItem label="Smart Insights" icon={
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M7 2a5 5 0 100 10A5 5 0 007 2zM7 5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            } />

            <div style={{ height: 1, background: FG.sidebarDivider, margin: "10px 0" }} />

            {/* Others */}
            <p style={{ color: FG.sectionLabel, fontSize: 9, fontWeight: 600, padding: "0 8px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("settings")}
            </p>
            <NavItem label="Settings" icon={
              <svg width="10" height="11" viewBox="0 0 12 13" fill="none"><path d="M6 8a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.1"/><path d="M9.5 6h1M1.5 6h1M6 1.5v1M6 9.5v1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
            } />
            <NavItem label="Help & Support" icon={
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.1"/><path d="M5.5 5.5a1.5 1.5 0 113 0c0 1-1.5 1.5-1.5 2.5M7 10v.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
            } />

            <div style={{ height: 1, background: FG.sidebarDivider, margin: "10px 0" }} />

            {/* Language */}
            <div style={{ padding: "0 8px" }}>
              <p style={{ color: FG.sectionLabel, fontSize: 9, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={FG.sectionLabel} strokeWidth="1.1"/><path d="M7 1.5C5.5 3.5 5.5 10.5 7 12.5M7 1.5C8.5 3.5 8.5 10.5 7 12.5M1.5 7h11" stroke={FG.sectionLabel} strokeWidth="1.1"/></svg>
                {t("language")}
              </p>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: FG.cardBg, border: `1px solid ${FG.cardBorder}`,
                borderRadius: 7, padding: "6px 10px",
              }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke={FG.navText} strokeWidth="1"/><path d="M6 1C4.5 3 4.5 9 6 11M6 1C7.5 3 7.5 9 6 11M1 6h10" stroke={FG.navText} strokeWidth="1"/></svg>
                <div style={{ flex: 1, display: "flex", gap: 4 }}>
                  {(["en", "si"] as FinanceLang[]).map(l => (
                    <button key={l} onClick={() => onLangChange(l)}
                      style={{
                        flex: 1, padding: "3px 0", borderRadius: 4, fontSize: 9, fontWeight: 600,
                        border: `1px solid ${lang === l ? "#2761d8" : FG.cardBorder}`,
                        background: lang === l ? "rgba(39,97,216,0.08)" : "transparent",
                        color: lang === l ? "#2761d8" : FG.navText,
                        cursor: "pointer",
                      }}>
                      {l === "en" ? "EN" : "සි"}
                    </button>
                  ))}
                </div>
                <svg width="8" height="5" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke={FG.navText} strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            <div style={{ height: 1, background: FG.sidebarDivider, margin: "10px 0" }} />

            {/* Currency */}
            <div style={{ padding: "0 8px" }}>
              <p style={{ color: FG.sectionLabel, fontSize: 9, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t("currency")}
              </p>
              <Select value={currency.code} onValueChange={onCurrencyChange}>
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700 }}>{currency.symbol}</span>
                      <span style={{ color: FG.navText }}>{currency.code}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code} className="text-xs">
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{c.flag}</span>
                        <span style={{ fontWeight: 600, width: 20 }}>{c.symbol}</span>
                        <span>{c.code}</span>
                        <span style={{ color: FG.navText }}>— {c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* User — Figma: bg #f2f3f5, initials circle, email truncated */}
          <div style={{ borderTop: `1px solid ${FG.sidebarDivider}`, padding: "10px 12px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, background: FG.userBg,
              borderRadius: 6, padding: "8px 10px",
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 12, background: FG.userInitialsBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 600, color: "#fff", flexShrink: 0,
              }}>NU</div>
              <span style={{ color: FG.userText, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                nuwansarat@gmail.com
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function FinancePage() {
  const [currency, setCurrencyState] = useState<Currency>(getSavedCurrency);
  const [lang, setLangState]         = useState<FinanceLang>(getSavedLang);
  const t = useMemo(() => getT(lang), [lang]);

  const changeCurrency = (code: string) => {
    const found = CURRENCIES.find(c => c.code === code);
    if (found) { setCurrencyState(found); saveCurrency(code); }
  };
  const changeLang = (l: FinanceLang) => { setLangState(l); saveLang(l); };

  const [month,     setMonth]     = useState(currentMonth);
  const [monthly,   setMonthly]   = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<Transaction[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [missingTable, setMissingTable] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formOpen,    setFormOpen]    = useState(false);
  const [editTx,      setEditTx]      = useState<Transaction | null>(null);
  const [defType,     setDefType]     = useState<TxType>("credit");
  const [deleteId,    setDeleteId]    = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    let list = [...monthly];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(tx => tx.title.toLowerCase().includes(q) || String(tx.amount).includes(q) || tx.category?.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") list = list.filter(tx => tx.type === typeFilter);
    if (catFilter  !== "all") list = list.filter(tx => tx.category === catFilter);
    if (sortBy === "amount")   list.sort((a, b) => Number(b.amount) - Number(a.amount));
    else                       list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [monthly, search, typeFilter, catFilter, sortBy]);

  const categories = useMemo(() => {
    const cats = new Set(monthly.map(tx => tx.category).filter(Boolean));
    return Array.from(cats).sort() as string[];
  }, [monthly]);

  const openAdd = (type: TxType) => { setEditTx(null); setDefType(type); setFormOpen(true); };
  const openEdit = (tx: Transaction) => { setEditTx(tx); setDefType(tx.type); setFormOpen(true); };

  const handleSaved = (tx: Transaction) => {
    if (tx.recurring) {
      setRecurring(prev => { const i = prev.findIndex(x => x.id === tx.id); return i >= 0 ? prev.map(x => x.id === tx.id ? tx : x) : [...prev, tx]; });
    } else {
      setMonthly(prev => { const i = prev.findIndex(x => x.id === tx.id); return i >= 0 ? prev.map(x => x.id === tx.id ? tx : x) : [tx, ...prev]; });
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: FG.pageBg,
        fontFamily: "Inter, sans-serif",
        width: "100%",
        maxWidth: "100vw",
        overflowX: "hidden",
      }}
    >

      {/* ── Header — sticky top, mobile-optimised ─────────────── */}
      <div
        style={{
          background: FG.headerBg,
          borderBottom: `1px solid ${FG.headerBorder}`,
          padding: "0 12px",
          flexShrink: 0,
          zIndex: 20,
          position: "sticky",
          top: 0,
        }}
      >
        {/* Row 1: hamburger + logo + currency (Cash In/Out moved to fixed bottom bar for mobile) */}
        <div style={{ display: "flex", alignItems: "center", height: 52, gap: 8 }}>
          {/* Hamburger */}
          <button onClick={() => setSidebarOpen(true)}
            aria-label="Menu"
            style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", flexShrink: 0 }}>
            <svg width="18" height="14" viewBox="0 0 16 12" fill="none">
              <path d="M1 1h14M1 6h14M1 11h14" stroke={FG.textSecondary} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Logo text */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <rect width="24" height="24" rx="5" fill="#2761d8"/>
              <path d="M5 7h14M5 11h10M5 15h12M5 19h8" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <span style={{ color: FG.textSecondary, fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("finance")}</span>
          </div>

          {/* Download report button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Download report"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 36, height: 36,
                  background: FG.currencyBg, border: `1px solid ${FG.currencyBorder}`,
                  borderRadius: 8, cursor: "pointer", flexShrink: 0,
                }}>
                <Download size={15} color={FG.textSecondary} strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ minWidth: 200 }}>
              <DropdownMenuItem
                onClick={() => downloadCSV(monthly, recurring, month, currency)}
                style={{ cursor: "pointer", gap: 10 }}
              >
                <FileSpreadsheet size={15} />
                <span>Download CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => printHTMLReport(monthly, recurring, month, currency)}
                style={{ cursor: "pointer", gap: 10 }}
              >
                <FileText size={15} />
                <span>Print / Save as PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Currency selector — compact on mobile */}
          <button onClick={() => setSidebarOpen(true)}
            aria-label="Currency"
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: FG.currencyBg, border: `1px solid ${FG.currencyBorder}`,
              borderRadius: 8, padding: "8px 12px", cursor: "pointer",
              flexShrink: 0, minHeight: 36,
            }}>
            <span style={{ color: FG.textSecondary, fontSize: 13, fontWeight: 700 }}>{currency.symbol}</span>
            <span style={{ color: FG.currencyText, fontSize: 11, fontWeight: 600 }}>{currency.code}</span>
            <svg width="8" height="5" viewBox="0 0 10 6" fill="none">
              <path d="M1 1l4 4 4-4" stroke={FG.currencyText} strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Row 2: Month navigator — Figma: white bg, border, centered text */}
        <div style={{ display: "flex", alignItems: "center", paddingBottom: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 0,
            background: FG.monthBg, border: `1px solid ${FG.monthBorder}`,
            borderRadius: 4, overflow: "hidden",
          }}>
            <button onClick={() => setMonth(prevMonth(month))}
              style={{ width: 30, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", background: "transparent", cursor: "pointer" }}>
              <svg width="5" height="9" viewBox="0 0 6 10" fill="none">
                <path d="M5 1L1 5l4 4" stroke={FG.monthText} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button onClick={() => setMonth(currentMonth())}
              style={{ minWidth: 110, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", background: "transparent", cursor: "pointer",
                color: FG.monthText, fontSize: 12, fontWeight: 600 }}>
              {monthLabel(month)}
            </button>
            <button onClick={() => setMonth(nextMonth(month))}
              style={{ width: 30, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", background: "transparent", cursor: "pointer" }}>
              <svg width="5" height="9" viewBox="0 0 6 10" fill="none">
                <path d="M1 1l4 4-4 4" stroke={FG.monthText} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Body — natural page scroll (not nested scroll) ────── */}
      <div style={{ flex: 1, padding: "14px 14px 90px", width: "100%", maxWidth: "100%" }}>

        {/* Setup banner */}
        {missingTable && (
          <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, padding: "10px 14px", marginBottom: 12 }}>
            <p style={{ color: "#92400e", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>⚙️ Setup Required</p>
            <p style={{ color: "#b45309", fontSize: 10 }}>
              Run <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 3 }}>supabase/migrations/003_finance_tracker.sql</code> in Supabase SQL Editor.
            </p>
          </div>
        )}

        {/* Balance Cards */}
        <BalanceCards monthly={monthly} recurring={recurring} month={month} currency={currency} t={t} />

        {/* Separator */}
        <div style={{ height: 1, background: FG.cardBorder, margin: "12px 0" }} />

        {/* AI Insights */}
        <AIInsightsCard monthly={monthly} recurring={recurring} month={month} currency={currency} t={t} />

        {/* Search + Filter */}
        <div style={{ marginTop: 12 }}>
          <SearchFilterBar
            search={search} onSearch={setSearch}
            typeFilter={typeFilter} onTypeFilter={setTypeFilter}
            catFilter={catFilter} onCatFilter={setCatFilter}
            sortBy={sortBy} onSort={setSortBy}
            categories={categories} t={t}
          />
        </div>

        {/* Entries */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: FG.entriesLabel, fontSize: 12, fontWeight: 700 }}>{t("entries")}</span>
            {filtered.length > 0 && (
              <span style={{ color: FG.labelMuted, fontSize: 10 }}>{filtered.length} {t("transactions")}</span>
            )}
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 60, background: FG.cardBg, border: `1px solid ${FG.cardBorder}`, borderRadius: 6, animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            // Empty state — matches Figma exactly
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "48px 24px", gap: 8,
            }}>
              {/* Document icon — matches Figma empty state icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 8,
                background: "#eef0f4",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#9aa0ac" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M14 2v6h6M8 13h8M8 17h5" stroke="#9aa0ac" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p style={{ color: FG.emptyTitle, fontSize: 12, fontWeight: 500 }}>{t("noEntriesYet")}</p>
              <p style={{ color: FG.emptySubtitle, fontSize: 10, textAlign: "center", maxWidth: 200 }}>{t("startAdding")}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(tx => (
                <TxRow key={tx.id} tx={tx} onEdit={openEdit} onDelete={setDeleteId} currency={currency} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed bottom: Cash In | Cash Out — sits just above the app's bottom nav ── */}
      <div style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 64px)",
        left: 0, right: 0, zIndex: 30,
        background: "rgba(254,254,254,0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: `1px solid ${FG.headerBorder}`,
        padding: "10px 14px",
        display: "flex", gap: 10,
        maxWidth: "100vw",
      }}>
        <button onClick={() => openAdd("credit")} style={{
          flex: 1, height: 46, borderRadius: 10, border: "none",
          background: FG.amountGreen, color: "#fff",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          {t("cashIn")}
        </button>
        <button onClick={() => openAdd("debit")} style={{
          flex: 1, height: 46, borderRadius: 10, border: "none",
          background: FG.amountRed, color: "#fff",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <svg width="12" height="3" viewBox="0 0 10 2" fill="none">
            <path d="M1 1h8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          {t("cashOut")}
        </button>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────── */}
      <SidebarSheet
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        currency={currency} onCurrencyChange={changeCurrency}
        lang={lang} onLangChange={changeLang} t={t}
      />

      <TxFormDialog
        open={formOpen} onOpenChange={setFormOpen}
        editTx={editTx} defaultType={defType}
        onSaved={handleSaved} currency={currency} t={t}
      />

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: FG.textPrimary }}>{t("deleteEntry")}</AlertDialogTitle>
            <AlertDialogDescription style={{ color: FG.labelMuted }}>{t("deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}
              style={{ background: FG.amountRed, color: "#fff" }}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
