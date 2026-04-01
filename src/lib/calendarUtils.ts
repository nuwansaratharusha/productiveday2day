import { TimeBlockData, CATEGORIES, DAYS, parseTimeRange } from "@/data/plannerData";

export function downloadDailyReport(
  blocks: TimeBlockData[],
  completed: Record<string, boolean>,
  selectedDay: number
) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const totalMin = blocks.reduce((s, b) => s + b.dur, 0);
  const doneMin = blocks.reduce((s, b) => s + (completed[b.id] ? b.dur : 0), 0);
  const pct = totalMin > 0 ? Math.round((doneMin / totalMin) * 100) : 0;

  const completedBlocks = blocks.filter((b) => completed[b.id]);
  const missedBlocks = blocks.filter((b) => !completed[b.id]);

  const catDone: Record<string, number> = {};
  const catTotal: Record<string, number> = {};
  blocks.forEach((b) => {
    catTotal[b.cat] = (catTotal[b.cat] || 0) + b.dur;
    if (completed[b.id]) catDone[b.cat] = (catDone[b.cat] || 0) + b.dur;
  });

  let report = `╔══════════════════════════════════════════════╗
║           ZIP DAILY REPORT                   ║
╚══════════════════════════════════════════════╝

📅 ${dateStr}
📊 Day: ${DAYS[selectedDay]} (${selectedDay < 5 ? "Weekday" : "Weekend"})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OVERALL PROGRESS: ${pct}%
  Completed: ${doneMin} min / ${totalMin} min
  Blocks Done: ${completedBlocks.length} / ${blocks.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 CATEGORY BREAKDOWN
`;

  Object.entries(catTotal).forEach(([cat, total]) => {
    const done = catDone[cat] || 0;
    const catPct = Math.round((done / total) * 100);
    const icon = CATEGORIES[cat]?.icon || "•";
    report += `  ${icon} ${cat}: ${done}/${total} min (${catPct}%)\n`;
  });

  report += `
✅ COMPLETED BLOCKS
`;
  if (completedBlocks.length === 0) {
    report += `  (none)\n`;
  } else {
    completedBlocks.forEach((b) => {
      report += `  ✓ [${b.time}] ${b.block} — ${b.desc} (${b.dur} min)\n`;
    });
  }

  report += `
❌ MISSED BLOCKS
`;
  if (missedBlocks.length === 0) {
    report += `  (none — perfect day! 🎉)\n`;
  } else {
    missedBlocks.forEach((b) => {
      report += `  ✗ [${b.time}] ${b.block} — ${b.desc} (${b.dur} min)\n`;
    });
  }

  report += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ZIP Solutions — The Art of Hospitality
  Generated: ${now.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ZIP-Report-${DAYS[selectedDay]}-${now.toISOString().split("T")[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getGoogleCalendarUrl(block: TimeBlockData, date: Date): string {
  const [startMin, endMin] = parseTimeRange(block.time);

  const startDate = new Date(date);
  startDate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

  const formatGCal = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${CATEGORIES[block.cat]?.icon || ""} ${block.block}`,
    details: `${block.desc}\n\nCategory: ${block.cat}\nDuration: ${block.dur} min\n\n— ZIP Daily Planner`,
    dates: `${formatGCal(startDate)}/${formatGCal(endDate)}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function pushToGoogleCalendar(
  blocks: TimeBlockData[],
  completed: Record<string, boolean>
) {
  const completedBlocks = blocks.filter((b) => completed[b.id]);
  if (completedBlocks.length === 0) return 0;

  const today = new Date();

  const icsContent = generateICS(completedBlocks, today);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ZIP-Schedule-${today.toISOString().split("T")[0]}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return completedBlocks.length;
}

export function pushSingleToCalendar(block: TimeBlockData) {
  const url = getGoogleCalendarUrl(block, new Date());
  window.open(url, "_blank");
}

function generateICS(blocks: TimeBlockData[], date: Date): string {
  const formatICS = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ZIP Solutions//Daily Planner//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

  blocks.forEach((block) => {
    const [startMin, endMin] = parseTimeRange(block.time);

    const start = new Date(date);
    start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

    const end = new Date(date);
    end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

    const icon = CATEGORIES[block.cat]?.icon || "";

    ics += `BEGIN:VEVENT
DTSTART:${formatICS(start)}
DTEND:${formatICS(end)}
SUMMARY:${icon} ${block.block}
DESCRIPTION:${block.desc}\\nCategory: ${block.cat}\\nDuration: ${block.dur} min\\n\\n— ZIP Daily Planner
STATUS:CONFIRMED
END:VEVENT
`;
  });

  ics += `END:VCALENDAR`;
  return ics;
}
