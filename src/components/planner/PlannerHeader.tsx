// =============================================================
// ProductiveDay — Planner Header (Figma redesign)
//   - Greeting + large Garamond date
//   - 3 action pill buttons: Manage / Sync / live time
//   - Full-width 7-column week strip, today = orange pill
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
  return { short: DAYS[dayIndex].slice(0, 3), num: target.getDate() };
}

// ── Icon: settings cog ───────────────────────────────────────
function ManageIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  );
}

// ── Icon: calendar ────────────────────────────────────────────
function CalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
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
    height: 32, padding: "0 11px",
    border: "1px solid #e5e7eb", borderRadius: 8,
    background: "#fff", color: "#333",
    fontSize: 12, fontWeight: 500,
    cursor: "pointer",
    display: "flex", alignItems: "center", gap: 5,
    fontFamily: SANS,
    whiteSpace: "nowrap",
    outline: "none",
  };

  return (
    <div style={{
      background: "#fff",
      borderBottom: "1px solid #f0f0f0",
      padding: "18px 24px 0",
      position: "sticky",
      top: 0,
      zIndex: 20,
    }}>
      {/* ── Top row ────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 14,
        gap: 12,
      }}>
        {/* Left: greeting + date */}
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: 12, color: "#888",
            margin: 0, fontFamily: SANS,
            lineHeight: 1.4,
          }}>
            {greeting}{firstName ? `, ${firstName}` : ""}
          </p>
          <h1 style={{
            fontFamily: GARAMOND,
            fontSize: "clamp(20px, 2.4vw, 27px)",
            fontWeight: 700,
            color: "#000",
            margin: "3px 0 0",
            letterSpacing: "-0.3px",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {dateStr}
          </h1>
        </div>

        {/* Right: 3 action buttons */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          flexShrink: 0, marginTop: 3,
        }}>
          <button style={pillBtn}
            onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
          >
            <ManageIcon /> Manage
          </button>

          <button style={pillBtn}
            onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
          >
            <CalIcon /> Sync
          </button>

          {/* Live time toggle */}
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
            {timeStr}
          </button>
        </div>
      </div>

      {/* ── Week strip ─────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 3,
      }}>
        {DAYS.map((_, i) => {
          const { short, num } = getDayTabLabel(i);
          const isSelected = selectedDay === i;
          const isToday    = i === defaultDay;

          return (
            <button
              key={i}
              onClick={() => onSelectDay(i)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center",
                padding: "8px 4px 11px",
                borderRadius: 10, border: "none",
                background: isSelected ? ORANGE : "transparent",
                cursor: "pointer", outline: "none",
                transition: "background .15s",
              }}
              onMouseEnter={e => {
                if (!isSelected)
                  (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f5";
              }}
              onMouseLeave={e => {
                if (!isSelected)
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              {/* Day abbreviation */}
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: isSelected
                  ? "rgba(255,255,255,0.85)"
                  : isToday
                    ? ORANGE
                    : "#aaa",
                letterSpacing: "0.2px",
                marginBottom: 4,
                textTransform: "uppercase",
                fontFamily: SANS,
                lineHeight: 1,
              }}>
                {short}
              </span>

              {/* Date number */}
              <span style={{
                fontSize: 15, fontWeight: 700,
                color: isSelected
                  ? "#fff"
                  : isToday
                    ? ORANGE
                    : "#111",
                lineHeight: 1,
                fontFamily: SANS,
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
