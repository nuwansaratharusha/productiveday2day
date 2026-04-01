import { TimeBlockData, Category, DEFAULT_CATEGORIES } from "@/data/plannerData";
import { CheckCircle2, Clock3 } from "lucide-react";

interface StatsBarProps {
  blocks: TimeBlockData[];
  completed: Record<string, boolean>;
  categories?: Record<string, Category>;
}

export function StatsBar({ blocks, completed, categories }: StatsBarProps) {
  const cats = categories || DEFAULT_CATEGORIES;
  const totalMin = blocks.reduce((s, b) => s + b.dur, 0);
  const doneMin = blocks.reduce((s, b) => s + (completed[b.id] ? b.dur : 0), 0);
  const completedCount = blocks.filter((b) => completed[b.id]).length;
  const pct = totalMin > 0 ? Math.round((doneMin / totalMin) * 100) : 0;

  const catTotals: Record<string, number> = {};
  blocks.forEach((b) => {
    catTotals[b.cat] = (catTotals[b.cat] || 0) + b.dur;
  });

  const totalHours = Math.round((totalMin / 60) * 10) / 10;
  const doneHours = Math.round((doneMin / 60) * 10) / 10;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card mb-5 overflow-hidden">
      {/* Top: stats row */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Today's Progress
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-foreground tracking-tight">{pct}%</span>
              <span className="text-sm text-muted-foreground font-medium">complete</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground">{completedCount}</span>
              <span>of {blocks.length} blocks</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{doneHours}h</span>
              <span>of {totalHours}h</span>
            </div>
          </div>
        </div>

        {/* Progress track */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full gradient-brand rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(catTotals).length > 0 && (
        <div className="px-5 pb-4 border-t border-border/50 pt-3 flex flex-wrap gap-1.5">
          {Object.entries(catTotals).map(([cat, min]) => {
            const c = cats[cat];
            if (!c) return null;
            const hours = Math.round((min / 60) * 10) / 10;
            return (
              <div
                key={cat}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-transform duration-150 hover:scale-[1.04] cursor-default"
                style={{ background: c.color, color: c.accent }}
              >
                <span className="text-[11px]">{c.icon}</span>
                <span>{cat}</span>
                <span className="opacity-70">·</span>
                <span>{hours}h</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
