export interface TimeBlockData {
  id: string;
  time: string;
  block: string;
  desc: string;
  cat: string;
  dur: number;
}

export interface Category {
  color: string;
  accent: string;
  icon: string;
}

const CATEGORIES_KEY = "zip-planner-categories";

export const DEFAULT_CATEGORIES: Record<string, Category> = {
  Personal: { color: "hsl(46 100% 94%)", accent: "hsl(40 94% 56%)", icon: "☀" },
  Learning: { color: "hsl(213 100% 94%)", accent: "hsl(213 77% 37%)", icon: "📖" },
  Revenue: { color: "hsl(0 100% 95%)", accent: "hsl(0 77% 47%)", icon: "💰" },
  Operations: { color: "hsl(280 100% 95%)", accent: "hsl(280 77% 35%)", icon: "⚙" },
  Delivery: { color: "hsl(133 100% 95%)", accent: "hsl(133 77% 35%)", icon: "🔧" },
  Product: { color: "hsl(187 100% 95%)", accent: "hsl(187 80% 28%)", icon: "🚀" },
  "Side Projects": { color: "hsl(27 100% 94%)", accent: "hsl(27 100% 45%)", icon: "🎯" },
  Branding: { color: "hsl(340 100% 95%)", accent: "hsl(340 72% 39%)", icon: "✦" },
  CIM: { color: "hsl(40 100% 94%)", accent: "hsl(27 100% 45%)", icon: "🎓" },
  Health: { color: "hsl(133 100% 95%)", accent: "hsl(133 77% 35%)", icon: "💪" },
  Creative: { color: "hsl(280 100% 95%)", accent: "hsl(280 77% 35%)", icon: "🎨" },
  Networking: { color: "hsl(187 100% 95%)", accent: "hsl(187 80% 28%)", icon: "🤝" },
};

export function loadCategories(): Record<string, Category> {
  try {
    const saved = localStorage.getItem(CATEGORIES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { ...DEFAULT_CATEGORIES };
}

export function saveCategories(cats: Record<string, Category>) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
}

// Keep CATEGORIES as a mutable reference for backward compat
export let CATEGORIES: Record<string, Category> = loadCategories();

export function updateCategoriesRef(cats: Record<string, Category>) {
  CATEGORIES = cats;
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parse12HourTime(timeStr: string): number {
  const cleaned = timeStr.trim();
  const isPM = /PM/i.test(cleaned);
  const isAM = /AM/i.test(cleaned);
  const numPart = cleaned.replace(/\s*(AM|PM)/i, "");
  const [h, m] = numPart.split(":").map(Number);
  let hours = h;
  if (isPM && h !== 12) hours += 12;
  if (isAM && h === 12) hours = 0;
  return hours * 60 + m;
}

export function parseTimeRange(timeRange: string): [number, number] {
  const parts = timeRange.split("–");
  const endRaw = parts[1].trim();
  const startRaw = parts[0].trim();

  const endPeriodMatch = endRaw.match(/(AM|PM)/i);
  const startPeriodMatch = startRaw.match(/(AM|PM)/i);

  let startStr = startRaw;
  if (!startPeriodMatch && endPeriodMatch) {
    startStr = startRaw + " " + endPeriodMatch[0];
  }

  return [parse12HourTime(startStr), parse12HourTime(endRaw)];
}

export function getCurrentTimeBlock(blocks: TimeBlockData[]): number {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < blocks.length; i++) {
    const [start, end] = parseTimeRange(blocks[i].time);
    if (currentMinutes >= start && currentMinutes < end) return i;
  }
  return -1;
}
