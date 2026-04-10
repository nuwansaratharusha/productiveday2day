// ─── Finance Tracker — Currency definitions ───────────────────

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$",   name: "US Dollar",           flag: "🇺🇸" },
  { code: "EUR", symbol: "€",   name: "Euro",                flag: "🇪🇺" },
  { code: "GBP", symbol: "£",   name: "British Pound",       flag: "🇬🇧" },
  { code: "INR", symbol: "₹",   name: "Indian Rupee",        flag: "🇮🇳" },
  { code: "LKR", symbol: "Rs",  name: "Sri Lankan Rupee",    flag: "🇱🇰" },
  { code: "AUD", symbol: "A$",  name: "Australian Dollar",   flag: "🇦🇺" },
  { code: "CAD", symbol: "C$",  name: "Canadian Dollar",     flag: "🇨🇦" },
  { code: "JPY", symbol: "¥",   name: "Japanese Yen",        flag: "🇯🇵" },
  { code: "CNY", symbol: "¥",   name: "Chinese Yuan",        flag: "🇨🇳" },
  { code: "CHF", symbol: "Fr",  name: "Swiss Franc",         flag: "🇨🇭" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham",          flag: "🇦🇪" },
  { code: "SAR", symbol: "﷼",   name: "Saudi Riyal",         flag: "🇸🇦" },
  { code: "SGD", symbol: "S$",  name: "Singapore Dollar",    flag: "🇸🇬" },
  { code: "MYR", symbol: "RM",  name: "Malaysian Ringgit",   flag: "🇲🇾" },
  { code: "THB", symbol: "฿",   name: "Thai Baht",           flag: "🇹🇭" },
  { code: "BRL", symbol: "R$",  name: "Brazilian Real",      flag: "🇧🇷" },
  { code: "ZAR", symbol: "R",   name: "South African Rand",  flag: "🇿🇦" },
  { code: "RUB", symbol: "₽",   name: "Russian Ruble",       flag: "🇷🇺" },
  { code: "KRW", symbol: "₩",   name: "South Korean Won",    flag: "🇰🇷" },
  { code: "MXN", symbol: "Mex$", name: "Mexican Peso",       flag: "🇲🇽" },
  { code: "IDR", symbol: "Rp",  name: "Indonesian Rupiah",   flag: "🇮🇩" },
];

const CURRENCY_STORAGE_KEY = "pd-finance-currency";
const LANG_STORAGE_KEY     = "pd-finance-lang";

export function getSavedCurrency(): Currency {
  try {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved) {
      const found = CURRENCIES.find(c => c.code === saved);
      if (found) return found;
    }
  } catch { /* ignore */ }
  return CURRENCIES[0]; // default USD
}

export function saveCurrency(code: string) {
  try { localStorage.setItem(CURRENCY_STORAGE_KEY, code); } catch { /* ignore */ }
}

export function getSavedLang(): "en" | "si" {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "si") return "si";
  } catch { /* ignore */ }
  return "en";
}

export function saveLang(lang: "en" | "si") {
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /* ignore */ }
}

export function formatAmount(amount: number, symbol: string): string {
  return `${symbol}${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
