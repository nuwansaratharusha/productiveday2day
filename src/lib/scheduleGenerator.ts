import { TimeBlockData } from "@/data/plannerData";

let idCounter = 1000;
const makeId = () => `gen-${++idCounter}`;

function formatTime(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function makeRange(startMin: number, dur: number): string {
  const endMin = startMin + dur;
  const startStr = formatTime(startMin);
  const endStr = formatTime(endMin);
  const startPeriod = startStr.slice(-2);
  const endPeriod = endStr.slice(-2);
  if (startPeriod === endPeriod) {
    return `${startStr.replace(/ (AM|PM)$/, "")}–${endStr}`;
  }
  return `${startStr}–${endStr}`;
}

interface BlockTemplate {
  block: string;
  desc: string;
  cat: string;
  dur: number;
}

const weekdayTemplate: BlockTemplate[] = [
  { block: "Morning Ritual", desc: "Wake up, hydrate, 10 min walk/stretch, review day plan", cat: "Personal", dur: 30 },
  { block: "Deep Learning", desc: "OTA-to-direct booking research, neuromarketing reading, books", cat: "Learning", dur: 60 },
  { block: "Breakfast + News", desc: "Eat, scan hospitality industry news", cat: "Personal", dur: 30 },
  { block: "Client Outreach", desc: "Upwork pitching (3-5 proposals), hotel direct mailing, GM emails", cat: "Revenue", dur: 90 },
  { block: "Finance Check", desc: "Personal + business credit/debit review, invoices", cat: "Operations", dur: 30 },
  { block: "Core Delivery", desc: "ZIP client work, web app dev, automation flows", cat: "Delivery", dur: 120 },
  { block: "Lunch Break", desc: "Eat, rest, no screens", cat: "Personal", dur: 30 },
  { block: "ZIP Web App Dev", desc: "Dedicated development sprint on ZIP web application", cat: "Product", dur: 60 },
  { block: "Cafe Connect + Batiks", desc: "Cafe Connect project, Gunatilake Batiks 10-year plan", cat: "Side Projects", dur: 60 },
  { block: "Hotel Visits", desc: "In-person GM meetings, hotel audits, site visits", cat: "Revenue", dur: 60 },
  { block: "Break + Recharge", desc: "Tea, short walk, clear mental space", cat: "Personal", dur: 30 },
  { block: "Automation & AI", desc: "Learn and build automation flows, AI tool integration", cat: "Learning", dur: 60 },
  { block: "LinkedIn + Branding", desc: "Write and schedule LinkedIn posts, personal brand content", cat: "Branding", dur: 60 },
  { block: "Dinner + Rest", desc: "Eat, decompress", cat: "Personal", dur: 30 },
  { block: "Script + Content", desc: "Script writing for reels/videos, content post creation", cat: "Branding", dur: 60 },
  { block: "Engage + Comment", desc: "Engage on 5-10 target posts, entrepreneurs, hotel GMs", cat: "Branding", dur: 30 },
  { block: "Evening Learning", desc: "CIM lecture prep, reading books & research papers", cat: "Learning", dur: 60 },
  { block: "Day Review + Plan", desc: "Review today, plan tomorrow, update task board", cat: "Operations", dur: 30 },
  { block: "Wind Down", desc: "No screens, prepare for sleep", cat: "Personal", dur: 30 },
];

const weekendTemplate: BlockTemplate[] = [
  { block: "Morning Ritual", desc: "Same routine — consistency matters", cat: "Personal", dur: 30 },
  { block: "CIM Lecture Prep", desc: "Pre-read material, prepare questions, review notes", cat: "Learning", dur: 90 },
  { block: "CIM LECTURE", desc: "Attend CIM class — full focus, no multitasking", cat: "CIM", dur: 240 },
  { block: "Lunch + Rest", desc: "Eat, decompress after lecture", cat: "Personal", dur: 60 },
  { block: "Content Batch", desc: "Film 2-3 reels, batch all video in one sitting", cat: "Branding", dur: 90 },
  { block: "Content Editing", desc: "Edit reels, captions, text overlays, schedule week", cat: "Branding", dur: 60 },
  { block: "Break", desc: "Rest, recharge", cat: "Personal", dur: 30 },
  { block: "Weekly Review", desc: "Finances, client pipeline, KPIs, update roadmap", cat: "Operations", dur: 90 },
  { block: "Deep Reading", desc: "Books, research papers, neuromarketing studies", cat: "Learning", dur: 60 },
  { block: "Dinner", desc: "Eat, relax", cat: "Personal", dur: 30 },
  { block: "Next Week Planning", desc: "Map priorities, schedule hotel visits, plan outreach", cat: "Operations", dur: 60 },
  { block: "Side Projects", desc: "Cafe Connect, Gunatilake Batiks, ZIP product research", cat: "Side Projects", dur: 60 },
  { block: "Wind Down", desc: "Reflect, journal, no screens", cat: "Personal", dur: 30 },
];

export function generateBlocksFromTemplate(
  template: BlockTemplate[],
  wakeUpMinutes: number
): TimeBlockData[] {
  let cursor = wakeUpMinutes;
  return template.map((t) => {
    const time = makeRange(cursor, t.dur);
    const block: TimeBlockData = {
      id: makeId(),
      time,
      block: t.block,
      desc: t.desc,
      cat: t.cat,
      dur: t.dur,
    };
    cursor += t.dur;
    return block;
  });
}

export function generateSchedule(wakeUpTime: string): {
  weekday: TimeBlockData[];
  weekend: TimeBlockData[];
} {
  const [h, m] = wakeUpTime.split(":").map(Number);
  const wakeUpMinutes = h * 60 + m;

  return {
    weekday: generateBlocksFromTemplate(weekdayTemplate, wakeUpMinutes),
    weekend: generateBlocksFromTemplate(weekendTemplate, wakeUpMinutes),
  };
}

export function recalculateTimes(
  blocks: TimeBlockData[],
  startMinutes?: number
): TimeBlockData[] {
  if (blocks.length === 0) return blocks;

  let cursor = startMinutes ?? parseStartMinutes(blocks[0].time);

  return blocks.map((b) => {
    const time = makeRange(cursor, b.dur);
    cursor += b.dur;
    return { ...b, time };
  });
}

function parseStartMinutes(timeRange: string): number {
  const startRaw = timeRange.split("–")[0].trim();
  const endRaw = timeRange.split("–")[1]?.trim() || "";
  const isPM = /PM/i.test(startRaw) || (!(/AM/i.test(startRaw)) && /PM/i.test(endRaw));
  const isAM = /AM/i.test(startRaw) || (!(/PM/i.test(startRaw)) && /AM/i.test(endRaw) && !/PM/i.test(endRaw));
  const numPart = startRaw.replace(/\s*(AM|PM)/i, "");
  const [h, m] = numPart.split(":").map(Number);
  let hours = h;
  if (isPM && h !== 12) hours += 12;
  if (isAM && h === 12) hours = 0;
  return hours * 60 + m;
}
