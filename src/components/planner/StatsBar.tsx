import { TimeBlockData, CATEGORIES } from "@/data/plannerData";

interface StatsBarProps {
  blocks: TimeBlockData[];
  completed: Record<string, boolean>;
}

export function StatsBar({ blocks, completed }: StatsBarProps) {
  const totalMin = blocks.reduce((s, b) => s + b.dur, 0);
  const doneMin = blocks.reduce((s, b) => s + (completed[b.id] ? b.dur : 0), 0);
  const pct = totalMin > 0 ? Math.round((doneMin / totalMin) * 100) : 0;

  const catTotals: Record<string, number> = {};
  blocks.forEach((b) => {
    catTotals[b.cat] = (catTotals[b.cat] || 0) + b.dur;
  });

  return (
    <div className="bg-card rounded-2xl p-5 mb-5 border border-border shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-sm text-card-foreground">Daily Progress</span>
        <span className="text-2xl font-extrabold text-primary">{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div
          className="h-full gradient-brand rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(catTotals).map(([cat, min]) => {
          const c = CATEGORIES[cat];
          if (!c) return null;
          return (
            <div
              key={cat}
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: c.color, color: c.accent }}
            >
              {c.icon} {cat}: {Math.round((min / 60) * 10) / 10}h
            </div>
          );
        })}
      </div>
    </div>
  );
}
