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

export const CATEGORIES: Record<string, Category> = {
  Personal: { color: "hsl(var(--cat-personal))", accent: "hsl(var(--cat-personal-accent))", icon: "☀" },
  Learning: { color: "hsl(var(--cat-learning))", accent: "hsl(var(--cat-learning-accent))", icon: "📖" },
  Revenue: { color: "hsl(var(--cat-revenue))", accent: "hsl(var(--cat-revenue-accent))", icon: "💰" },
  Operations: { color: "hsl(var(--cat-operations))", accent: "hsl(var(--cat-operations-accent))", icon: "⚙" },
  Delivery: { color: "hsl(var(--cat-delivery))", accent: "hsl(var(--cat-delivery-accent))", icon: "🔧" },
  Product: { color: "hsl(var(--cat-product))", accent: "hsl(var(--cat-product-accent))", icon: "🚀" },
  "Side Projects": { color: "hsl(var(--cat-side))", accent: "hsl(var(--cat-side-accent))", icon: "🎯" },
  Branding: { color: "hsl(var(--cat-branding))", accent: "hsl(var(--cat-branding-accent))", icon: "✦" },
  CIM: { color: "hsl(var(--cat-cim))", accent: "hsl(var(--cat-cim-accent))", icon: "🎓" },
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

let idCounter = 0;
const makeId = () => `block-${++idCounter}`;

export const defaultWeekdayBlocks: TimeBlockData[] = [
  { id: makeId(), time: "6:00–6:30 AM", block: "Morning Ritual", desc: "Wake up, hydrate, 10 min walk/stretch, review day plan", cat: "Personal", dur: 30 },
  { id: makeId(), time: "6:30–7:30 AM", block: "Deep Learning", desc: "OTA-to-direct booking research, neuromarketing reading, books", cat: "Learning", dur: 60 },
  { id: makeId(), time: "7:30–8:00 AM", block: "Breakfast + News", desc: "Eat, scan hospitality industry news", cat: "Personal", dur: 30 },
  { id: makeId(), time: "8:00–9:30 AM", block: "Client Outreach", desc: "Upwork pitching (3-5 proposals), hotel direct mailing, GM emails", cat: "Revenue", dur: 90 },
  { id: makeId(), time: "9:30–10:00 AM", block: "Finance Check", desc: "Personal + business credit/debit review, invoices", cat: "Operations", dur: 30 },
  { id: makeId(), time: "10:00 AM–12:00 PM", block: "Core Delivery", desc: "ZIP client work, web app dev, automation flows", cat: "Delivery", dur: 120 },
  { id: makeId(), time: "12:00–12:30 PM", block: "Lunch Break", desc: "Eat, rest, no screens", cat: "Personal", dur: 30 },
  { id: makeId(), time: "12:30–1:30 PM", block: "ZIP Web App Dev", desc: "Dedicated development sprint on ZIP web application", cat: "Product", dur: 60 },
  { id: makeId(), time: "1:30–2:30 PM", block: "Cafe Connect + Batiks", desc: "Cafe Connect project, Gunatilake Batiks 10-year plan", cat: "Side Projects", dur: 60 },
  { id: makeId(), time: "2:30–3:30 PM", block: "Hotel Visits", desc: "In-person GM meetings, hotel audits, site visits", cat: "Revenue", dur: 60 },
  { id: makeId(), time: "3:30–4:00 PM", block: "Break + Recharge", desc: "Tea, short walk, clear mental space", cat: "Personal", dur: 30 },
  { id: makeId(), time: "4:00–5:00 PM", block: "Automation & AI", desc: "Learn and build automation flows, AI tool integration", cat: "Learning", dur: 60 },
  { id: makeId(), time: "5:00–6:00 PM", block: "LinkedIn + Branding", desc: "Write and schedule LinkedIn posts, personal brand content", cat: "Branding", dur: 60 },
  { id: makeId(), time: "6:00–6:30 PM", block: "Dinner + Rest", desc: "Eat, decompress", cat: "Personal", dur: 30 },
  { id: makeId(), time: "6:30–7:30 PM", block: "Script + Content", desc: "Script writing for reels/videos, content post creation", cat: "Branding", dur: 60 },
  { id: makeId(), time: "7:30–8:00 PM", block: "Engage + Comment", desc: "Engage on 5-10 target posts, entrepreneurs, hotel GMs", cat: "Branding", dur: 30 },
  { id: makeId(), time: "8:00–9:00 PM", block: "Evening Learning", desc: "CIM lecture prep, reading books & research papers", cat: "Learning", dur: 60 },
  { id: makeId(), time: "9:00–9:30 PM", block: "Day Review + Plan", desc: "Review today, plan tomorrow, update task board", cat: "Operations", dur: 30 },
  { id: makeId(), time: "9:30–10:00 PM", block: "Wind Down", desc: "No screens, prepare for sleep", cat: "Personal", dur: 30 },
];

export const defaultWeekendBlocks: TimeBlockData[] = [
  { id: makeId(), time: "6:00–6:30 AM", block: "Morning Ritual", desc: "Same routine — consistency matters", cat: "Personal", dur: 30 },
  { id: makeId(), time: "6:30–8:00 AM", block: "CIM Lecture Prep", desc: "Pre-read material, prepare questions, review notes", cat: "Learning", dur: 90 },
  { id: makeId(), time: "8:00 AM–12:00 PM", block: "CIM LECTURE", desc: "Attend CIM class — full focus, no multitasking", cat: "CIM", dur: 240 },
  { id: makeId(), time: "12:00–1:00 PM", block: "Lunch + Rest", desc: "Eat, decompress after lecture", cat: "Personal", dur: 60 },
  { id: makeId(), time: "1:00–2:30 PM", block: "Content Batch", desc: "Film 2-3 reels, batch all video in one sitting", cat: "Branding", dur: 90 },
  { id: makeId(), time: "2:30–3:30 PM", block: "Content Editing", desc: "Edit reels, captions, text overlays, schedule week", cat: "Branding", dur: 60 },
  { id: makeId(), time: "3:30–4:00 PM", block: "Break", desc: "Rest, recharge", cat: "Personal", dur: 30 },
  { id: makeId(), time: "4:00–5:30 PM", block: "Weekly Review", desc: "Finances, client pipeline, KPIs, update roadmap", cat: "Operations", dur: 90 },
  { id: makeId(), time: "5:30–6:30 PM", block: "Deep Reading", desc: "Books, research papers, neuromarketing studies", cat: "Learning", dur: 60 },
  { id: makeId(), time: "6:30–7:00 PM", block: "Dinner", desc: "Eat, relax", cat: "Personal", dur: 30 },
  { id: makeId(), time: "7:00–8:00 PM", block: "Next Week Planning", desc: "Map priorities, schedule hotel visits, plan outreach", cat: "Operations", dur: 60 },
  { id: makeId(), time: "8:00–9:00 PM", block: "Side Projects", desc: "Cafe Connect, Gunatilake Batiks, ZIP product research", cat: "Side Projects", dur: 60 },
  { id: makeId(), time: "9:00–9:30 PM", block: "Wind Down", desc: "Reflect, journal, no screens", cat: "Personal", dur: 30 },
];

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
