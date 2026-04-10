// ─── Finance Tracker — i18n translations ──────────────────────
// Supports: English (en) | Sinhala (si)

export type FinanceLang = "en" | "si";

export const financeTranslations = {
  en: {
    // Header & Nav
    finance: "Finance",
    bookKeeping: "Book Keeping",
    settings: "Settings",
    language: "Language",
    english: "English",
    sinhala: "සිංහල",
    currency: "Currency",
    signOut: "Sign Out",

    // Balance
    netBalance: "Net Balance",
    totalCashIn: "Total Cash In",
    totalCashOut: "Total Cash Out",
    cashIn: "Cash In",
    cashOut: "Cash Out",
    overBudget: "Over budget",

    // Entries
    entries: "Entries",
    noEntriesYet: "No entries yet",
    startAdding: "Start adding your cash in and cash out entries",
    transactions: "transactions",

    // Form
    newEntry: "New Entry",
    editEntry: "Edit Entry",
    amount: "Amount",
    description: "Description",
    remark: "Remark",
    whatWasThisFor: "What was this for?",
    category: "Category",
    categoryOptional: "Category (Optional)",
    date: "Date",
    recurring: "Recurring",
    repeatMonthly: "Repeats every month",
    dayOfMonth: "Day of Month",
    saving: "Saving...",
    updateEntry: "Update Entry",
    addCashIn: "Add Cash In",
    addCashOut: "Add Cash Out",
    deleteEntry: "Delete Entry",
    deleting: "Deleting...",
    deleteConfirm:
      "Are you sure you want to delete this entry? This action cannot be undone.",
    cancel: "Cancel",
    delete: "Delete",

    // Search & Filter
    searchPlaceholder: "Search by remark or amount...",
    filters: "Filters",
    clearAll: "Clear all",
    type: "Type",
    allTypes: "All Types",
    allCategories: "All Categories",
    sortBy: "Sort By",
    dateLatest: "Date (Latest)",
    amountHighest: "Amount (Highest)",

    // AI Insights
    aiInsights: "AI Insights",
    getSmartAnalysis: "Get smart analysis of your finances",
    analyze: "Analyze",
    analyzing: "Analyzing...",
    refresh: "Refresh",

    // Setup
    setupRequired: "Setup Required",

    // Edit / Delete actions
    edit: "Edit",
  },
  si: {
    finance: "මූල්‍ය",
    bookKeeping: "පොත් තැබීම",
    settings: "සැකසීම්",
    language: "භාෂාව",
    english: "English",
    sinhala: "සිංහල",
    currency: "මුදල් ඒකකය",
    signOut: "පිටවන්න",

    netBalance: "ශුද්ධ ශේෂය",
    totalCashIn: "මුළු මුදල් ඇතුළත්",
    totalCashOut: "මුළු මුදල් පිටතට",
    cashIn: "මුදල් ඇතුළත්",
    cashOut: "මුදල් පිටතට",
    overBudget: "අයවැය ඉක්මවා",

    entries: "ඇතුළත් කිරීම්",
    noEntriesYet: "තවම ඇතුළත් කිරීම් නැත",
    startAdding: "ඔබේ මුදල් ඇතුළත් හා පිටතට ඇතුළත් කිරීම් එක් කරන්න",
    transactions: "ගනුදෙනු",

    newEntry: "නව ඇතුළත් කිරීම",
    editEntry: "ඇතුළත් කිරීම සංස්කරණය",
    amount: "මුදල",
    description: "විස්තරය",
    remark: "සටහන",
    whatWasThisFor: "මෙය කුමක් සඳහාද?",
    category: "වර්ගය",
    categoryOptional: "වර්ගය (අමතර)",
    date: "දිනය",
    recurring: "නැවත් කිරීම",
    repeatMonthly: "සෑම මාසයකම නැවත් කෙරේ",
    dayOfMonth: "මාසයේ දිනය",
    saving: "සුරකිමින්...",
    updateEntry: "යාවත්කාලීන කරන්න",
    addCashIn: "මුදල් ඇතුළත් කරන්න",
    addCashOut: "මුදල් පිටතට",
    deleteEntry: "ඇතුළත් කිරීම මකන්න",
    deleting: "මකමින්...",
    deleteConfirm:
      "ඔබට මෙම ඇතුළත් කිරීම මැකීමට අවශ්‍ය බව විශ්වාසද? මෙම ක්‍රියාව අහෝසි කළ නොහැක.",
    cancel: "අවලංගු",
    delete: "මකන්න",

    searchPlaceholder: "සටහන හෝ මුදල අනුව සොයන්න...",
    filters: "පෙරහන්",
    clearAll: "සියල්ල හිස් කරන්න",
    type: "වර්ගය",
    allTypes: "සියලු වර්ග",
    allCategories: "සියලු කාණ්ඩ",
    sortBy: "අනුපිළිවෙල",
    dateLatest: "දිනය (නවතම)",
    amountHighest: "මුදල (වැඩිම)",

    aiInsights: "AI විශ්ලේෂණ",
    getSmartAnalysis: "ඔබේ මූල්‍ය පිළිබඳ බුද්ධිමත් විශ්ලේෂණයක් ලබා ගන්න",
    analyze: "විශ්ලේෂණය",
    analyzing: "විශ්ලේෂණය කරමින්...",
    refresh: "නැවුම් කරන්න",

    setupRequired: "සැකසීම අවශ්‍යයි",
    edit: "සංස්කරණය",
  },
} as const;

export type FinanceTranslationKey = keyof typeof financeTranslations.en;

export function getT(lang: FinanceLang) {
  return (key: FinanceTranslationKey): string =>
    financeTranslations[lang][key] ?? financeTranslations.en[key] ?? key;
}
