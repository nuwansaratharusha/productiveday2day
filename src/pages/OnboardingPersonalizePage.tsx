// =============================================================
// ProductiveDay — Onboarding Step 2: Feature Personalisation
// Matches Figma exactly:
//   - Large left-aligned Garamond heading
//   - 3-col equal-width grid
//   - Orange filled = pre-selected (Main features)
//   - Dashed border = optional add-ons (You can add +)
//   - Role-specific feature sets
//   - "Productive Day" mark at bottom
// =============================================================
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";

const GARAMOND = `"Apple Garamond", "Apple Garamond Light", "EB Garamond", Garamond, Georgia, serif`;
const ORANGE   = "#FF5C00";

// ── Feature sets per role (matches Figma exactly) ─────────────
const ROLE_FEATURES: Record<string, { main: string[]; addable: string[] }> = {
  creator: {
    main:    ["Daily Planner", "Habits", "Creator Pipeline", "Calendar", "Profile", "Stats Dashboard", "Finance : Brand Deals"],
    addable: ["Finance (Credit / Debit)", "Health Tracker", "Motivations"],
  },
  student: {
    main:    ["Daily Planner", "Habits", "Short Note Generator", "Calendar", "Profile", "Note Manager", "Website Blocker"],
    addable: ["Finance (Credit / Debit)", "Health Tracker", "Motivations"],
  },
  custom: {
    main:    ["Daily Planner", "Profile"],
    addable: ["Habit Tracker", "Calendar", "Note Manager", "Short Note Generator", "Website Blocker", "Motivations", "Creator Pipeline", "Stats Dashboard", "Finance : Brand deals", "Finance (Credit / Debit)", "Health Tracker", "..."],
  },
  health: {
    main:    ["Daily Planner", "Profile"],
    addable: ["Health Tracker", "Habit Tracker", "Calendar", "Motivations", "Finance (Credit / Debit)", "Note Manager"],
  },
  fitness: {
    main:    ["Daily Planner", "Profile"],
    addable: ["Health Tracker", "Habit Tracker", "Calendar", "Motivations", "Finance (Credit / Debit)", "Note Manager"],
  },
};
const FALLBACK = ROLE_FEATURES.custom;

// ── Pill component ────────────────────────────────────────────
function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 40,
        borderRadius: 8,
        border: active ? "none" : "1.5px dashed #c8c8c8",
        background: active ? ORANGE : "#fff",
        color: active ? "#fff" : "#111",
        fontSize: 13,
        fontWeight: 400,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
        cursor: "pointer",
        outline: "none",
        transition: "background .12s, border-color .12s, color .12s",
        padding: "0 4px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        width: "100%",
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = "#999";
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = "#c8c8c8";
      }}
    >
      {label}
    </button>
  );
}

// ── Section label ─────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: "#000",
      margin: "0 0 12px", letterSpacing: "0.2px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    }}>
      {text}
    </p>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function OnboardingPersonalizePage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const supabase   = createClient();
  const userType   = (location.state as { userType?: string })?.userType ?? "custom";
  const featureSet = ROLE_FEATURES[userType] ?? FALLBACK;

  const [selected, setSelected] = useState<Set<string>>(new Set(featureSet.main));
  const [saving,   setSaving]   = useState(false);

  function toggle(f: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  async function handleContinue() {
    if (saving) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert(
        { id: user.id, features: [...selected], onboarded: true },
        { onConflict: "id" }
      );
    }
    navigate("/chat", { replace: true });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    }}>

      {/* ── Scrollable body ──────────────────────────────────── */}
      <div className="personalize-body" style={{
        flex: 1,
        padding: "72px 60px 80px 180px",
        boxSizing: "border-box",
      }}>

        {/* Heading */}
        <h1 style={{
          fontFamily: GARAMOND,
          fontSize: "clamp(28px, 3.5vw, 46px)",
          fontWeight: 400,
          color: "#000",
          margin: "0 0 48px",
          lineHeight: 1.2,
          letterSpacing: "-0.4px",
          maxWidth: 640,
        }}>
          Which features are you interested in trying?
        </h1>

        {/* ── Main features ────────────────────────────────── */}
        <SectionLabel text="Main features" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 190px)",
          gap: 10,
          marginBottom: 40,
        }}>
          {featureSet.main.map(f => (
            <Pill key={f} label={f} active={selected.has(f)} onClick={() => toggle(f)} />
          ))}
        </div>

        {/* ── You can add ──────────────────────────────────── */}
        <SectionLabel text="You can add +" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 190px)",
          gap: 10,
          marginBottom: 52,
        }}>
          {featureSet.addable.map(f => (
            <Pill key={f} label={f} active={selected.has(f)} onClick={() => toggle(f)} />
          ))}
        </div>

        {/* ── Get Started button ────────────────────────────── */}
        <button
          onClick={handleContinue}
          disabled={saving || selected.size === 0}
          style={{
            height: 44, padding: "0 36px",
            borderRadius: 8, border: "none",
            background: selected.size > 0 && !saving ? ORANGE : "#e5e7eb",
            color: selected.size > 0 && !saving ? "#fff" : "#9ca3af",
            fontSize: 14, fontWeight: 600,
            cursor: selected.size > 0 && !saving ? "pointer" : "not-allowed",
            transition: "background .15s",
          }}
          onMouseEnter={e => { if (selected.size > 0 && !saving) (e.currentTarget as HTMLButtonElement).style.background = "#e05200"; }}
          onMouseLeave={e => { if (selected.size > 0 && !saving) (e.currentTarget as HTMLButtonElement).style.background = ORANGE; }}
        >
          {saving ? "Setting up…" : "Get Started →"}
        </button>
      </div>

      {/* ── Bottom brand mark ──────────────────────────────── */}
      <div style={{
        padding: "16px 0 24px 180px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <img src="/logo.svg" alt="" width={22} height={22} style={{ objectFit: "contain" }} />
        <span style={{
          fontFamily: GARAMOND, fontSize: 12,
          fontWeight: 700, color: "#000", letterSpacing: "0.2px",
        }}>
          Productive Day
        </span>
      </div>

      {/* Responsive: mobile layout */}
      <style>{`
        @media (max-width: 767px) {
          .personalize-body {
            padding: 40px 24px 80px !important;
          }
          .personalize-body > div[style*="grid-template-columns"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
