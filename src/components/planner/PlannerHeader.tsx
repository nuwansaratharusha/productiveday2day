// =============================================================
// ProductiveDay — Planner Header (pixel-perfect Figma match)
//
//  ┌─ greeting + date ───────────────────── [Manage][Sync][Time] ─┐
//  │  "Good afternoon, Tharusha"                                  │
//  │  "Wednesday, April 22"                                       │
//  └──────────────────────────────────────────────────────────────┘
//  ┌─ week strip card ────────────────────────────────────────────┐
//  │ Monday  20 │ Tue 21 │ Wednesday 22 │ Thu 23 │ Fri 24 │ … │  │
//  ├────────────┼─────────────────────────────────────────────────┤
//  │ ~ TODAY    │                    (empty)                      │
//  │ 0 of 11 bl.│                                                 │
//  │ ————       │                                                 │
//  └────────────┴─────────────────────────────────────────────────┘
// =============================================================
import { useState } from "react";
import { DAYS } from "@/data/plannerData";
import { useAuth } from "@/components/auth/AuthProvider";

const ORANGE   = "#FF5C00";
const GARAMOND = `"Apple Garamond", "Apple Garamond Light", "EB Garamond", Garamond, Georgia, serif`;
const SANS     = `-apple-system, BlinkMacSystemFont, "Inter", sans-serif`;

interface PlannerHeaderProps {
  selectedDay:     number;
  defaultDay:      number;
  time:            Date;
  onSelectDay:     (day: number) => void;
  blocksCompleted: number;
  blocksTotal:     number;
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDayNum(dayIndex: number) {
  const today    = new Date();
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const diff     = dayIndex - todayDow;
  const target   = new Date(today);
  target.setDate(today.getDate() + diff);
  return target.getDate();
}

// ── Trophy icon ───────────────────────────────────────────────
function TrophyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke={ORANGE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a2 2 0 0 1-2-2V5h4"/>
      <path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/>
      <path d="M6 9a6 6 0 0 0 12 0"/>
      <path d="M12 15v3"/><path d="M8 21h8"/>
    </svg>
  );
}

// ── Google Calendar icon ──────────────────────────────────────
function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="20" height="19" rx="2" fill="#fff" stroke="#4285F4" strokeWidth="1.5"/>
      <line x1="2" y1="9" x2="22" y2="9" stroke="#EA4335" strokeWidth="1.5"/>
      <line x1="8" y1="1" x2="8" y2="5" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16" y1="1" x2="16" y2="5" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="12" y="19" textAnchor="middle" fontSize="8" fontWeight="700" fill="#34A853" fontFamily="Arial">31</text>
    </svg>
  );
}

// ── Trending icon (for stats label) ──────────────────────────
function TrendIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="#aaa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  );
}

export function PlannerHeader({
  selectedDay, defaultDay, time, onSelectDay,
  blocksCompleted, blocksTotal,
}: PlannerHeaderProps) {
  const { user }     = useAuth();
  const [use24h, setUse24h] = useState(false);

  const hour      = time.getHours();
  const greeting  = getGreeting(hour);
  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] || "";

  const timeStr = use24h
    ? time.toLocaleTimeString("en-GB",  { hour: "2-digit", minute: "2-digit" })
    : time.toLocaleTimeString("en-US",  { hour: "numeric", minute: "2-digit" });

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const pct = blocksTotal > 0 ? Math.round((blocksCompleted / blocksTotal) * 100) : 0;

  const pillBtn: React.CSSProperties = {
    height: 34, padding: "0 13px",
    border: "1.5px solid #e5e7eb", borderRadius: 9,
    background: "#fff", color: "#333",
    fontSize: 12, fontWeight: 500,
    cursor: "pointer",
    display: "flex", alignItems: "center", gap: 6,
    fontFamily: SANS, whiteSpace: "nowrap", outline: "none",
  };

  return (
    <div style={{ background: "#fff", position: "sticky", top: 0, zIndex: 20 }}>

      {/* ── Greeting row ────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "18px 28px 14px",
        gap: 16,
      }}>
        <div>
          <p style={{ fontSize: 12, color: "#aaa", margin: 0, fontFamily: SANS, lineHeight: 1.4 }}>
            {greeting}{firstName ? `, ${firstName}` : ""}
          </p>
          <h1 style={{
            fontFamily: GARAMOND,
            fontSize: "clamp(22px, 2vw, 28px)",
            fontWeight: 700, color: "#000",
            margin: "3px 0 0", letterSpacing: "-0.4px", lineHeight: 1.15,
          }}>
            {dateStr}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 2 }}>
          <button style={pillBtn}
            onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
            <TrophyIcon /><span>Manage</span>
          </button>
          <button style={pillBtn}
            onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
            <CalendarIcon /><span>Sync</span>
          </button>
          <button onClick={() => setUse24h(v => !v)}
            style={{ ...pillBtn, fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", flexShrink: 0 }} />
            <span>{timeStr}</span>
          </button>
        </div>
      </div>

      {/* ── Combined week-strip + stats card ────────────────── */}
      <div style={{
        margin: "0 28px 20px",
        border: "1.5px solid #ebebeb",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
      }}>

        {/* Day-of-week row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: "1px solid #f0f0f0",
        }}>
          {DAYS.map((day, i) => {
            const num        = getDayNum(i);
            const isSelected = selectedDay === i;
            const isToday    = i === defaultDay;

            return (
              <button
                key={i}
                onClick={() => onSelectDay(i)}
                style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                  padding: "13px 14px",
                  background: isSelected ? ORANGE : "#fff",
                  border: "none",
                  borderRight: i < 6 ? "1px solid #f0f0f0" : "none",
                  cursor: "pointer", outline: "none",
                  transition: "background .15s",
                }}
                onMouseEnter={e => {
                  if (!isSelected)
                    (e.currentTarget as HTMLButtonElement).style.background = "#fdf5f2";
                }}
                onMouseLeave={e => {
                  if (!isSelected)
                    (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                }}
              >
                <span style={{
                  fontSize: 12, fontWeight: 500, fontFamily: SANS,
                  color: isSelected ? "rgba(255,255,255,0.88)" : isToday ? ORANGE : "#aaa",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  marginRight: 4,
                }}>
                  {day}
                </span>
                <span style={{
                  fontSize: 15, fontWeight: 700, fontFamily: SANS, flexShrink: 0,
                  color: isSelected ? "#fff" : isToday ? ORANGE : "#111",
                }}>
                  {num}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stats row — integrated into the card, left-aligned */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
        }}>
          {/* First cell: stats content */}
          <div style={{
            gridColumn: "1 / span 2",
            padding: "12px 16px 14px",
            borderRight: "1px solid #f0f0f0",
          }}>
            {/* Label */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <TrendIcon />
              <span style={{ fontSize: 9, fontWeight: 700, color: "#bbb", fontFamily: SANS, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                Today
              </span>
            </div>
            {/* Count */}
            <p style={{ fontSize: 12, fontWeight: 500, color: "#333", margin: "0 0 9px", fontFamily: SANS }}>
              {blocksCompleted} of {blocksTotal} blocks
            </p>
            {/* Progress bar */}
            <div style={{ height: 2, background: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: ORANGE, borderRadius: 2,
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>

          {/* Remaining 5 cells: empty with right borders */}
          {[1,2,3,4].map(j => (
            <div key={j} style={{
              borderRight: j < 4 ? "1px solid #f0f0f0" : "none",
              padding: "12px 0",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
