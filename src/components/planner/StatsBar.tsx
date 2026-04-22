// =============================================================
// ProductiveDay — Planner Stats Bar (Figma compact redesign)
//   - Mini arc donut ring (56px)
//   - "TODAY" label + "N of M blocks"
//   - Orange progress bar with 4 percentage markers
// =============================================================
import { useEffect, useRef, useState } from "react";
import { TimeBlockData, Category, DEFAULT_CATEGORIES } from "@/data/plannerData";

const ORANGE = "#FF5C00";
const SANS   = `-apple-system, BlinkMacSystemFont, "Inter", sans-serif`;

interface StatsBarProps {
  blocks:     TimeBlockData[];
  completed:  Record<string, boolean>;
  categories?: Record<string, Category>;
}

// ── Animated counter ──────────────────────────────────────────
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  const start  = useRef<number | null>(null);
  const from   = useRef(0);

  useEffect(() => {
    from.current = value;
    start.current = null;
    let raf: number;
    function step(ts: number) {
      if (!start.current) start.current = ts;
      const elapsed = ts - start.current;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from.current + (target - from.current) * ease));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  return value;
}

// ── Arc ring SVG ──────────────────────────────────────────────
function MiniArcRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const strokeW   = 4.5;
  const r         = (size - strokeW) / 2;
  const circ      = 2 * Math.PI * r;
  const startAngle = -225; // degrees — start from lower-left
  const arcSpan   = 270;   // degrees of total arc
  const totalArc  = (arcSpan / 360) * circ;
  const done      = (pct / 100) * totalArc;

  const rotate    = startAngle; // CSS transform rotate

  return (
    <svg
      width={size} height={size}
      style={{ transform: `rotate(${rotate}deg)`, display: "block" }}
    >
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#f0f0f0"
        strokeWidth={strokeW}
        strokeDasharray={`${totalArc} ${circ}`}
        strokeLinecap="round"
      />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        strokeWidth={strokeW}
        strokeDasharray={`${done} ${circ}`}
        strokeLinecap="round"
        stroke={ORANGE}
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)" }}
      />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────
export function StatsBar({ blocks, completed, categories }: StatsBarProps) {
  const _cats = categories || DEFAULT_CATEGORIES;
  const completedCount = blocks.filter(b => completed[b.id]).length;
  const pct = blocks.length > 0
    ? Math.round((completedCount / blocks.length) * 100)
    : 0;
  const animPct = useCountUp(pct);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "#fff",
      border: "1px solid #f0f0f0",
      borderRadius: 14,
      padding: "13px 16px 13px 14px",
      marginBottom: 14,
    }}>
      {/* Mini arc ring */}
      <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
        <MiniArcRing pct={pct} size={56} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: 14, fontWeight: 800,
            color: "#111", lineHeight: 1,
            fontFamily: SANS,
          }}>
            {animPct}
          </span>
          <span style={{ fontSize: 8, color: "#aaa", fontFamily: SANS, marginTop: 1 }}>%</span>
        </div>
      </div>

      {/* Right side: label + text + bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 10, fontWeight: 700,
          color: "#aaa", margin: 0,
          letterSpacing: "0.6px",
          textTransform: "uppercase",
          fontFamily: SANS,
        }}>
          Today
        </p>
        <p style={{
          fontSize: 14, fontWeight: 600,
          color: "#111", margin: "3px 0 9px",
          fontFamily: SANS,
        }}>
          {completedCount}{" "}
          <span style={{ color: "#888", fontWeight: 400 }}>of</span>{" "}
          {blocks.length} blocks
        </p>

        {/* Progress bar */}
        <div style={{
          height: 5, background: "#f0f0f0",
          borderRadius: 10, overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, #FF8040, ${ORANGE})`,
            borderRadius: 10,
            transition: "width 0.7s ease",
          }} />
        </div>

        {/* 4 markers */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 5,
        }}>
          {[25, 50, 75, 100].map(m => (
            <span key={m} style={{
              fontSize: 9, fontWeight: 600,
              color: pct >= m ? ORANGE : "#d1d5db",
              fontFamily: SANS,
              transition: "color 0.4s",
            }}>
              {m}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
