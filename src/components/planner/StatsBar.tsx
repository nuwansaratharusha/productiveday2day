import { TimeBlockData, Category, DEFAULT_CATEGORIES } from "@/data/plannerData";
import { CheckCircle2, Clock3, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface StatsBarProps {
  blocks: TimeBlockData[];
  completed: Record<string, boolean>;
  categories?: Record<string, Category>;
}

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    if (prev.current === target) return;
    const start = prev.current;
    const diff = target - start;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

export function StatsBar({ blocks, completed, categories }: StatsBarProps) {
  const cats = categories || DEFAULT_CATEGORIES;
  const totalMin = blocks.reduce((s, b) => s + b.dur, 0);
  const doneMin  = blocks.reduce((s, b) => s + (completed[b.id] ? b.dur : 0), 0);
  const completedCount = blocks.filter((b) => completed[b.id]).length;
  const pct = totalMin > 0 ? Math.round((doneMin / totalMin) * 100) : 0;

  const animatedPct = useCountUp(pct);

  const catTotals: Record<string, number> = {};
  blocks.forEach((b) => { catTotals[b.cat] = (catTotals[b.cat] || 0) + b.dur; });

  const totalHours = Math.round((totalMin / 60) * 10) / 10;
  const doneHours  = Math.round((doneMin  / 60) * 10) / 10;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card mb-5 overflow-hidden animate-fade-in">

      {/* Top: stats */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Today's Progress
              </p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-4xl font-extrabold tracking-tight tabular-nums"
                style={{
                  background: "linear-gradient(135deg, hsl(14 90% 48%), hsl(356 85% 46%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {animatedPct}%
              </span>
              <span className="text-sm text-muted-foreground font-medium">complete</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-foreground">{completedCount}</span>
              <span>of {blocks.length} blocks</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-bold text-foreground">{doneHours}h</span>
              <span>of {totalHours}h</span>
            </div>
          </div>
        </div>

        {/* Animated progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden relative">
          <div
            className="h-full gradient-brand rounded-full transition-all duration-700 ease-out relative overflow-hidden progress-shimmer"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Milestone markers */}
        {pct > 0 && (
          <div className="flex justify-between mt-1.5 px-0.5">
            {[25, 50, 75, 100].map((m) => (
              <span
                key={m}
                className={`text-[9px] font-bold tabular-nums transition-colors duration-300 ${
                  pct >= m ? "text-primary" : "text-muted-foreground/40"
                }`}
              >
                {m}%
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Category chips */}
      {Object.keys(catTotals).length > 0 && (
        <div className="px-5 pb-4 border-t border-border/40 pt-3 flex flex-wrap gap-1.5">
          {Object.entries(catTotals).map(([cat, min], idx) => {
            const c = cats[cat];
            if (!c) return null;
            const hours = Math.round((min / 60) * 10) / 10;
            return (
              <div
                key={cat}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
                           cursor-default transition-all duration-200 hover:scale-105 hover:shadow-sm animate-stagger"
                style={{
                  background: c.color,
                  color: c.accent,
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                <span>{c.icon}</span>
                <span>{cat}</span>
                <span className="opacity-60">·</span>
                <span>{hours}h</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
