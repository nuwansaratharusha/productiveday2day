// =============================================================
// ProductiveDay — Time Block Card (Figma redesign)
//   - Drag dots handle (left)
//   - 3 px coloured left accent border
//   - Open-circle checkbox → fills on complete
//   - Title (centre left) | bold start time + end + category pill (right)
//   - Edit / delete on hover
//   - All drag-and-drop events preserved
// =============================================================
import { useState } from "react";
import { TimeBlockData, Category, DEFAULT_CATEGORIES } from "@/data/plannerData";
import { Check, Pencil, Trash2, Zap } from "lucide-react";

const ORANGE = "#FF5C00";
const SANS   = `-apple-system, BlinkMacSystemFont, "Inter", sans-serif`;

interface TimeBlockProps {
  block:        TimeBlockData;
  index:        number;
  isActive:     boolean;
  completed:    boolean;
  onToggle:     () => void;
  onEdit:       () => void;
  onDelete:     () => void;
  isDragging?:  boolean;
  isDropTarget?: boolean;
  dropPosition?: "above" | "below" | null;
  onDragStart:  (e: React.DragEvent) => void;
  onDragEnd:    (e: React.DragEvent) => void;
  onDragOver:   (e: React.DragEvent) => void;
  onDragLeave:  (e: React.DragEvent) => void;
  onDrop:       (e: React.DragEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove:  (e: React.TouchEvent) => void;
  onTouchEnd:   (e: React.TouchEvent) => void;
  categories?:  Record<string, Category>;
}

// ── Drag handle: 6 dots in 2×3 grid ─────────────────────────
function DragDots() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 4px)",
      gridTemplateRows:    "repeat(3, 4px)",
      gap: "2px 2px",
      opacity: 0.3,
    }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          width: 3, height: 3,
          borderRadius: "50%",
          background: "#888",
        }} />
      ))}
    </div>
  );
}

export function TimeBlock({
  block, index, isActive, completed, onToggle, onEdit, onDelete,
  isDragging, isDropTarget, dropPosition,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onTouchStart, onTouchMove, onTouchEnd,
  categories,
}: TimeBlockProps) {
  const cats = categories || DEFAULT_CATEGORIES;
  const cat  = cats[block.cat] || {
    color:  "#f5f5f5",
    accent: "#888",
    icon:   "📌",
  };

  const [justCompleted, setJustCompleted] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleToggle = () => {
    if (!completed) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 700);
    }
    onToggle();
  };

  // Parse "9:00 AM – 10:00 AM" → start / end
  const timeParts = block.time.split(/[–—-]/);
  const startTime = timeParts[0]?.trim() ?? "";
  const endTime   = timeParts[1]?.trim() ?? "";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        borderRadius: 12,
        border: `1px solid ${isActive ? ORANGE + "44" : "#efefef"}`,
        marginBottom: 8,
        background: completed ? "#fafafa" : "#fff",
        overflow: "hidden",
        cursor: "pointer",
        userSelect: "none",
        transition: "all 0.2s",
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? "scale(0.97)" : hovered ? "translateY(-1px)" : "none",
        boxShadow: isActive
          ? `0 0 0 1.5px ${ORANGE}33, 0 4px 18px ${ORANGE}14`
          : hovered
            ? "0 3px 12px rgba(0,0,0,0.07)"
            : "none",
        animationDelay: `${index * 45}ms`,
      }}
      onClick={handleToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >

      {/* ── Drop target indicators ─────────────────────────── */}
      {isDropTarget && dropPosition === "above" && (
        <div style={{
          position: "absolute", top: -1, left: 16, right: 16,
          height: 2, background: ORANGE,
          borderRadius: 2, zIndex: 10,
        }} />
      )}
      {isDropTarget && dropPosition === "below" && (
        <div style={{
          position: "absolute", bottom: -1, left: 16, right: 16,
          height: 2, background: ORANGE,
          borderRadius: 2, zIndex: 10,
        }} />
      )}

      {/* ── Active block: top stripe ──────────────────────── */}
      {isActive && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, #FF8040, ${ORANGE})`,
        }} />
      )}

      {/* ── Drag handle ───────────────────────────────────── */}
      <div
        style={{
          width: 30, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "grab",
        }}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <DragDots />
      </div>

      {/* ── Coloured accent border ────────────────────────── */}
      <div style={{
        width: 3, flexShrink: 0,
        background: cat.accent,
        margin: "10px 0",
        borderRadius: 2,
        opacity: completed ? 0.35 : 1,
        transition: "opacity 0.3s",
      }} />

      {/* ── Main content ──────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "12px 12px 12px 11px",
        minWidth: 0,
      }}>

        {/* Open-circle checkbox */}
        <div
          style={{
            width: 19, height: 19, borderRadius: "50%",
            border: `1.5px solid ${completed ? cat.accent : "#d1d5db"}`,
            background: completed ? cat.accent : "transparent",
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.25s",
            transform: justCompleted ? "scale(1.18)" : "scale(1)",
            boxShadow: completed ? `0 2px 8px ${cat.accent}40` : "none",
          }}
          onClick={e => { e.stopPropagation(); handleToggle(); }}
        >
          {completed && (
            <Check style={{ width: 10, height: 10, color: "#fff" }} strokeWidth={3} />
          )}
        </div>

        {/* Block title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 14, fontWeight: block.block ? 500 : 400,
              color: completed ? "#aaa" : block.block ? "#111" : "#ccc",
              textDecoration: completed ? "line-through" : "none",
              transition: "all 0.25s",
              fontFamily: SANS,
              lineHeight: 1.4,
            }}>
              {block.block || "—"}
            </span>

            {/* NOW badge */}
            {isActive && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 9, fontWeight: 700,
                color: ORANGE,
                background: ORANGE + "15",
                padding: "2px 6px",
                borderRadius: 20,
                letterSpacing: "0.4px",
                fontFamily: SANS,
              }}>
                <Zap style={{ width: 8, height: 8 }} />
                NOW
              </span>
            )}
          </div>

          {/* Description */}
          {block.desc && (
            <p style={{
              fontSize: 11, color: "#999",
              margin: "2px 0 0",
              lineHeight: 1.4,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              fontFamily: SANS,
              opacity: completed ? 0.5 : 1,
            }}>
              {block.desc}
            </p>
          )}
        </div>

        {/* ── Right: time + category pill ─────────────────── */}
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "flex-end", gap: 3, flexShrink: 0,
        }}>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: completed ? "#aaa" : "#111",
            lineHeight: 1, fontFamily: SANS,
          }}>
            {startTime}
          </span>
          <span style={{
            fontSize: 10, color: "#aaa",
            lineHeight: 1, fontFamily: SANS,
          }}>
            {endTime || `${block.dur}m`}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 500,
            background: cat.color,
            color: cat.accent,
            padding: "2px 8px",
            borderRadius: 20,
            whiteSpace: "nowrap",
            fontFamily: SANS,
            marginTop: 1,
          }}>
            {block.cat}
          </span>
        </div>

        {/* ── Edit / delete (hover) ──────────────────────── */}
        <div
          style={{
            display: "flex", flexDirection: "column", gap: 2,
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateX(0)" : "translateX(4px)",
            transition: "all 0.15s",
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            style={{
              width: 26, height: 26, borderRadius: 7, border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#aaa",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6";
              (e.currentTarget as HTMLButtonElement).style.color = "#333";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "#aaa";
            }}
            aria-label="Edit"
          >
            <Pencil style={{ width: 11, height: 11 }} />
          </button>

          <button
            onClick={onDelete}
            style={{
              width: 26, height: 26, borderRadius: 7, border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#aaa",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2";
              (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "#aaa";
            }}
            aria-label="Delete"
          >
            <Trash2 style={{ width: 11, height: 11 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
