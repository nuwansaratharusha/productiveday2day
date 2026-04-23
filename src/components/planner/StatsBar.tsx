// =============================================================
// ProductiveDay — Stats Bar (Figma exact match)
//   Simple card: "TODAY" label + "N of M blocks" + thin progress line
//   Small, left-aligned, no arc ring
// =============================================================
import { TimeBlockData, Category, DEFAULT_CATEGORIES } from "@/data/plannerData";

const ORANGE = "#FF5C00";
const SANS   = `-apple-system, BlinkMacSystemFont, "Inter", sans-serif`;

interface StatsBarProps {
  blocks:      TimeBlockData[];
  completed:   Record<string, boolean>;
  categories?: Record<string, Category>;
}

export function StatsBar({ blocks, completed }: StatsBarProps) {
  const completedCount = blocks.filter(b => completed[b.id]).length;
  const pct = blocks.length > 0
    ? Math.round((completedCount / blocks.length) * 100)
    : 0;

  return (
    <div style={{
      border: "1.5px solid #ebebeb",
      borderRadius: 12,
      padding: "14px 20px 16px",
      display: "inline-flex",
      flexDirection: "column",
      minWidth: 200,
      maxWidth: 280,
      background: "#fff",
      marginBottom: 20,
    }}>
      {/* "TODAY" label */}
      <p style={{
        fontSize: 10, fontWeight: 700,
        color: "#bbb", margin: 0,
        letterSpacing: "0.7px",
        textTransform: "uppercase",
        fontFamily: SANS,
      }}>
        Today
      </p>

      {/* "N of M blocks" */}
      <p style={{
        fontSize: 13, fontWeight: 500,
        color: "#333", margin: "4px 0 12px",
        fontFamily: SANS,
        lineHeight: 1.3,
      }}>
        {completedCount} of {blocks.length} blocks
      </p>

      {/* Thin progress line */}
      <div style={{
        height: 2, background: "#f0f0f0",
        borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: ORANGE,
          borderRadius: 2,
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}
