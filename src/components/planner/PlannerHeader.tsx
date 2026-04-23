// =============================================================
// ProductiveDay — Planner Header (pixel-perfect Figma match)
//
//  Layout:
//  ┌─ greeting/date row ──────────────────────── [Manage][Sync][Time] ─┐
//  │  "Good afternoon, Tharusha"                                       │
//  │  "Wednesday, April 22"          (large serif)                     │
//  └───────────────────────────────────────────────────────────────────┘
//  ┌─ week strip (full-width bordered card) ───────────────────────────┐
//  │ Monday  20 │ Tuesday  21 │ Wednesday  22 │ Thursday  20 │ …      │
//  │            (orange bg when today/selected)                        │
//  └───────────────────────────────────────────────────────────────────┘
// =============================================================
import { useState } from "react";
import { DAYS } from "@/data/plannerData";
import { useAuth } from "@/components/auth/AuthProvider";

const ORANGE   = "#FF5C00";
const GARAMOND = `"Apple Garamond", "Apple Garamond Light", "EB Garamond", Garamond, Georgia, serif`;
const SANS     = `-apple-system, BlinkMacSystemFont, "Inter", sans-serif`;

interface PlannerHeaderProps {
  selectedDay: number;
  defaultDay:  number;
  time:        Date;
  onSelectDay: (day: number) => void;
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDayTabLabel(dayIndex: number) {
  const today    = new Date();
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const diff     = dayIndex - todayDow;
  const target   = new Date(today);
  target.setDate(today.getDate() + diff);
  return target.getDate();
}

// ── Trophy icon for Manage ───────────────────────────────────
function TrophyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a2 2 0 0 1-2-2V5h4"/>
      <path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/>
      <path d="M6 9a6 6 0 0 0 12 0"/>
      <path d="M12 15v3"/><path d="M8 21h8"/>
    </svg>
  );
}

// ── Google-style calendar icon for Sync ──────────────────────
function SyncIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="#4285F4"/>
      <line x1="8"  y1="2" x2="8"  y2="6" stroke="#4285F4"/>
      <line x1="3"  y1="10" x2="21" y2="10" stroke="#EA4335"/>
      <text x="12" y="18" textAnchor="middle" fontSize="7" fontWeight="700" fill="#34A853">31</text>
    </svg>
  );
}

export function PlannerHeader({
  selectedDay, defaultDay, time, onSelectDay,
}: PlannerHeaderProps) {
  const { user }  = useAuth();
  const [use24h, setUse24h] = useState(false);

  const hour      = time.getHours();
  const greeting  = getGreeting(hour);
  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "";

  const timeStr = use24h
    ? time.toLocaleTimeString("en-GB",  { hour: "2-digit", minute: "2-digit" })
    : time.toLocaleTimeString("en-US",  { hour: "numeric", minute: "2-digit" });

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const pillBtn: React.CSSProperties = {
    height: 34, padding: "0 13px",
    border: "1.5px solid #e5e7eb", borderRadius: 9,
    background: "#fff", color: "#333",
    fontSize: 12, fontWeight: 500,
    cursor: "pointer",
    display: "flex", alignItems: "center", gap: 6,
    fontFamily: SANS,
    whiteSpace: "nowrap",
    outline: "none",
    letterSpacing: "-0.1px",
  };

  return (
    <div style={{ background: "#fff", position: "sticky", top: 0, zIndex: 20 }}>

      {/* ── Greeting + date + action buttons ──────────────── */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "20px 28px 16px",
        gap: 16,
      }}>
        {/* Left: greeting + date */}
        <div>
          <p style={{
            fontSize: 12, color: "#aaa",
            margin: 0, fontFamily: SANS,
            lineHeight: 1.4,
          }}>
            {greeting}{firstName ? `, ${firstName}` : ""}
          </p>
          <h1 style={{
            fontFamily: GARAMOND,
            fontSize: "clamp(22px, 2.2vw, 30px)",
            fontWeight: 700,
            color: "#000",
            margin: "4px 0 0",
            letterSpacing: "-0.4px",
            lineHeight: 1.15,
          }}>
            {dateStr}
          </h1>
        </div>

        {/* Right: 3 pill buttons */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          flexShrink: 0, marginTop: 4,
        }}>
          <button style={pillBtn}
            onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
          >
            <TrophyIcon />
            <span style={{ color: "#111" }}>Manage</span>
          </button>

          <button style={pillBtn}
            onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
          >
            <SyncIcon />
            <span style={{ color: "#111" }}>Sync</span>
          </button>

          <button
            onClick={() => setUse24h(v => !v)}
            style={{ ...pillBtn, fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
          >
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#22c55e", flexShrink: 0,
              display: "inline-block",
            }} />
            <span style={{ color: "#111" }}>{timeStr}</span>
          </button>
        </div>
      </div>

      {/* ── Full-width week strip ──────────────────────────── */}
      <div style={{
        margin: "0 28px 20px",
        border: "1.5px solid #ebebeb",
        borderRadius: 12,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
      }}>
        {DAYS.map((day, i) => {
          const num        = getDayTabLabel(i);
          const isSelected = selectedDay === i;
          const isToday    = i === defaultDay;

          return (
            <button
              key={i}
              onClick={() => onSelectDay(i)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 14px",
                background: isSelected ? ORANGE : "#fff",
                border: "none",
                borderRight: i < 6 ? "1px solid #f0f0f0" : "none",
                cursor: "pointer",
                outline: "none",
                transition: "background .15s",
                minWidth: 0,
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
              {/* Day name — left aligned */}
              <span style={{
                fontSize: 12,
                fontWeight: 500,
                color: isSelected ? "rgba(255,255,255,0.9)" : isToday ? ORANGE : "#aaa",
                fontFamily: SANS,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginRight: 4,
              }}>
                {day}
              </span>

              {/* Date number — right aligned, bold */}
              <span style={{
                fontSize: 15,
                fontWeight: 700,
                color: isSelected ? "#fff" : isToday ? ORANGE : "#111",
                fontFamily: SANS,
                flexShrink: 0,
              }}>
                {num}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
