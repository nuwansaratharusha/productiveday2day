// =============================================================
// ProductiveDay — Onboarding Page
// "What best describes you?" — user picks their role
// Figma: "What would you like to use this platform for?" frame
// =============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";

const GARAMOND = `"Apple Garamond", "Apple Garamond Light", "EB Garamond", Garamond, Georgia, serif`;
const ORANGE   = "#F4541A";

// ── Option card data ──────────────────────────────────────────
const OPTIONS = [
  {
    id: "creator",
    label: "Content Creator",
    emoji: "🎬",
    desc: "Manage ideas, scripts & publishing",
    available: true,
  },
  {
    id: "student",
    label: "Student",
    emoji: "📚",
    desc: "Track assignments & stay organised",
    available: true,
  },
  {
    id: "health",
    label: "Health",
    emoji: "🩺",
    desc: "Nutrition, sleep & wellness tracking",
    available: false,
  },
  {
    id: "fitness",
    label: "Fitness Enthusiast",
    emoji: "🏋️",
    desc: "Workouts, goals & progress tracking",
    available: false,
  },
];

export default function OnboardingPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const navigate                = useNavigate();
  const supabase                = createClient();

  async function handleContinue() {
    if (!selected) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Best-effort: silently ignore if column doesn't exist yet
      await supabase
        .from("profiles")
        .upsert({ id: user.id, user_type: selected, onboarded: true }, { onConflict: "id" });
    }

    setSaving(false);
    navigate("/", { replace: true });
  }

  function handleCustom() {
    setSelected("custom");
    // Proceed immediately for "Custom" selection
    setSaving(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles")
          .upsert({ id: user.id, user_type: "custom", onboarded: true }, { onConflict: "id" })
          .then(() => navigate("/", { replace: true }));
      } else {
        navigate("/", { replace: true });
      }
    });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 24px 40px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
      boxSizing: "border-box",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32 }}>
        <img src="/logo.svg" alt="Productive Day" width={56} height={56} style={{ objectFit: "contain" }} />
      </div>

      {/* Heading */}
      <h1 style={{
        fontFamily: GARAMOND,
        fontSize: 34,
        fontWeight: 400,
        color: "#111",
        textAlign: "center",
        margin: "0 0 10px",
        lineHeight: 1.2,
        letterSpacing: "-0.3px",
        maxWidth: 340,
      }}>
        What best describes you?
      </h1>

      <p style={{
        fontSize: 15,
        color: "#6b7280",
        textAlign: "center",
        margin: "0 0 36px",
        maxWidth: 300,
        lineHeight: 1.55,
      }}>
        We'll personalise your experience to match your goals.
      </p>

      {/* Option cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        width: "100%",
        maxWidth: 380,
        marginBottom: 16,
      }}>
        {OPTIONS.map(opt => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => opt.available && setSelected(opt.id)}
              disabled={!opt.available}
              style={{
                position: "relative",
                borderRadius: 16,
                border: isSelected
                  ? `2px solid ${ORANGE}`
                  : opt.available
                    ? "1.5px solid #e5e7eb"
                    : "1.5px solid #f3f4f6",
                background: isSelected ? "#fff7f4" : opt.available ? "#fff" : "#fafafa",
                padding: "20px 16px",
                cursor: opt.available ? "pointer" : "default",
                textAlign: "left",
                transition: "border-color .15s, background .15s, box-shadow .15s",
                boxShadow: isSelected
                  ? `0 0 0 4px rgba(244,84,26,0.1)`
                  : "0 1px 4px rgba(0,0,0,0.05)",
                opacity: opt.available ? 1 : 0.6,
              }}
              onMouseEnter={e => {
                if (opt.available && !isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#F4541A80";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(244,84,26,0.12)";
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = opt.available ? "#e5e7eb" : "#f3f4f6";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)";
                }
              }}
            >
              {/* Coming soon badge */}
              {!opt.available && (
                <span style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#9ca3af",
                  background: "#f3f4f6",
                  borderRadius: 6,
                  padding: "2px 6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  Soon
                </span>
              )}

              {/* Selected check */}
              {isSelected && (
                <div style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: ORANGE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              {/* Emoji */}
              <div style={{
                fontSize: 28,
                marginBottom: 10,
                lineHeight: 1,
              }}>
                {opt.emoji}
              </div>

              {/* Label */}
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: opt.available ? "#111" : "#9ca3af",
                marginBottom: 4,
                lineHeight: 1.3,
              }}>
                {opt.label}
              </div>

              {/* Description */}
              <div style={{
                fontSize: 11.5,
                color: opt.available ? "#6b7280" : "#c9cdd4",
                lineHeight: 1.5,
              }}>
                {opt.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom option */}
      <button
        onClick={handleCustom}
        disabled={saving}
        style={{
          width: "100%",
          maxWidth: 380,
          height: 50,
          borderRadius: 14,
          border: "none",
          background: selected === "custom" ? "#c93a10" : "#111",
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "background .15s",
          letterSpacing: "-0.1px",
        }}
        onMouseEnter={e => {
          if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#222";
        }}
        onMouseLeave={e => {
          if (!saving) (e.currentTarget as HTMLButtonElement).style.background = selected === "custom" ? "#c93a10" : "#111";
        }}
      >
        ✦ Something else / Custom
      </button>

      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={!selected || saving}
        style={{
          width: "100%",
          maxWidth: 380,
          height: 50,
          borderRadius: 14,
          border: "none",
          background: selected && !saving ? ORANGE : "#f3f4f6",
          color: selected && !saving ? "#fff" : "#9ca3af",
          fontSize: 15,
          fontWeight: 600,
          cursor: selected && !saving ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "background .2s, color .2s",
        }}
      >
        {saving ? (
          <>
            <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
              <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Setting up…
          </>
        ) : "Continue →"}
      </button>

      {/* Skip */}
      <button
        onClick={() => navigate("/", { replace: true })}
        style={{
          background: "none",
          border: "none",
          color: "#9ca3af",
          fontSize: 13,
          cursor: "pointer",
          marginTop: 16,
          padding: "4px 8px",
        }}
      >
        Skip for now
      </button>

      {/* Footer brand */}
      <div style={{
        marginTop: "auto",
        paddingTop: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        opacity: 0.5,
      }}>
        <img src="/logo.svg" alt="" width={24} height={24} style={{ objectFit: "contain" }} />
        <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: GARAMOND, letterSpacing: "0.5px" }}>
          Productive Day
        </span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
