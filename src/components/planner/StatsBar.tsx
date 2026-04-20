import { TimeBlockData, Category, DEFAULT_CATEGORIES } from "@/data/plannerData";
import { CheckCircle2, Clock3, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface StatsBarProps {
  blocks: TimeBlockData[];
  completed: Record<string, boolean>;
  categories?: Record<string, Category>;
}

function useCountUp(target: number, duration = 700) {
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
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

// SVG circular arc progress ring
function ArcRing({ pct, size = 96 }: { pct: number; size?: number }) {
  const strokeW = 7;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  // We only use 270° of the circle (¾ arc), starting from bottom-left
  const arcFraction = 0.75;
  const totalArc = circ * arcFraction;
  const done = totalArc * Math.min(pct / 100, 1);

  return (
    <svg width={size} height={size} className="block" style={{ transform: "rotate(135deg)" }}>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeW}
        strokeDasharray={`${totalArc} ${circ}`}
        strokeLinecap="round"
        className="text-muted/40"
      />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        strokeWidth={strokeW}
        strokeDasharray={`${done} ${circ}`}
        strokeLinecap="round"
        style={{
          stroke: "url(#brandGrad)",
          transition: "stroke-dasharray 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
      <defs>
        {/* Use CSS custom properties so the gradient respects light/dark mode */}
        <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   style={{ stopColor: "hsl(var(--zip-orange))" }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--zip-red))"    }} />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function StatsBar({ blocks, completed, categories }: StatsBarProps) {
  const cats = categories || DEFAULT_CATEGORIES;
  const totalMin = blocks.reduce((s, b) => s + b.dur, 0);
  const doneMin  = blocks.reduce((s, b) => s + (completed[b.id] ? b.dur : 0), 0);
  const completedCount = blocks.filter((b) => completed[b.id]).length;
  const pct = totalMin > 0 ? Math.round((doneMin / totalMin) * 100) : 0;
  const animatedPct = useCountUp(pct);

  const totalHours = (totalMin / 60).toFixed(1).replace(".0", "");
  const doneHours  = (doneMin  / 60).toFixed(1).replace(".0", "");

  const catTotals: Record<string, number> = {};
  blocks.forEach((b) => { catTotals[b.cat] = (catTotals[b.cat] || 0) + b.dur; });

  return (
    <div className="mb-5 animate-fade-in space-y-2">

      {/* Top bento row */}
      <div className="grid grid-cols-3 gap-2">

        {/* Main card — arc ring + percentage (spans 2 cols) */}
        <div className="col-span-2 rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-4 flex items-center gap-4 overflow-hidden relative">
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          {/* Ring */}
          <div className="relative flex-shrink-0 w-[88px] h-[88px] flex items-center justify-center">
            <ArcRing pct={pct} size={88} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold tabular-nums leading-none text-gradient-brand">
                {animatedPct}
              </span>
              <span className="text-[9px] text-muted-foreground font-semibold mt-0.5">%</span>
            </div>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Today
              </span>
            </div>
            <div className="text-sm font-bold text-foreground leading-snug">
              {completedCount} of {blocks.length}
              <span className="text-muted-foreground font-medium"> blocks</span>
            </div>

            {/* Progress bar */}
            <div className="mt-2.5 h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full gradient-brand rounded-full transition-all duration-700 ease-out relative overflow-hidden progress-shimmer"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              {[25, 50, 75, 100].map((m) => (
                <span key={m} className={`text-[8px] font-bold tabular-nums transition-colors ${pct >= m ? "text-primary" : "text-muted-foreground/30"}`}>
                  {m}%
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Hours card */}
        <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-4 flex flex-col justify-between">
          <Clock3 className="w-4 h-4 text-muted-foreground/60" />
          <div>
            <div className="text-xl font-extrabold text-foreground tabular-nums leading-none">
              {doneHours}
              <span className="text-sm font-semibold text-muted-foreground">h</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">of {totalHours}h</div>
          </div>
          {/* Mini vertical bar */}
          <div className="h-1 bg-muted/50 rounded-full overflow-hidden mt-1">
            <div
              className="h-full gradient-brand rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category chips row */}
      {Object.keys(catTotals).length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-0.5">
          {Object.entries(catTotals).map(([cat, min], idx) => {
            const c = cats[cat];
            if (!c) return null;
            const doneForCat = blocks.filter((b) => b.cat === cat && completed[b.id]).reduce((s, b) => s + b.dur, 0);
            const catPct = Math.round((doneForCat / min) * 100);
            const hours = (min / 60).toFixed(1).replace(".0", "");
            return (
              <div
                key={cat}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
                           cursor-default transition-all duration-200 hover:scale-105 animate-stagger"
                style={{ background: c.color, color: c.accent, animationDelay: `${idx * 40}ms` }}
              >
                <span>{c.icon}</span>
                <span>{cat}</span>
                <span className="opacity-50">·</span>
                <span>{hours}h</span>
                {catPct > 0 && (
                  <span className="opacity-70 text-[9px]">{catPct}%</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
