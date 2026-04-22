// =============================================================
// ProductiveDay — Onboarding Step 2: Personalisation
// Placeholder — will be replaced once Figma design is provided
// =============================================================
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";

const GARAMOND = `"Apple Garamond", "Apple Garamond Light", "EB Garamond", Garamond, Georgia, serif`;
const ORANGE   = "#FF5C00";

const GOALS = [
  { id: "productivity",   label: "Boost my productivity"        },
  { id: "organisation",   label: "Stay more organised"          },
  { id: "content",        label: "Grow my content/business"     },
  { id: "finances",       label: "Manage my finances better"    },
  { id: "habits",         label: "Build better habits"          },
  { id: "focus",          label: "Improve my focus"             },
];

export default function OnboardingPersonalizePage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving,   setSaving]   = useState(false);
  const navigate                = useNavigate();
  const location                = useLocation();
  const supabase                = createClient();
  const userType                = (location.state as { userType?: string })?.userType ?? "custom";

  function toggle(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleContinue() {
    if (saving || selected.length === 0) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .upsert({ id: user.id, goals: selected, onboarded: true }, { onConflict: "id" });
    }
    navigate("/chat", { replace: true });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 24px 80px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
      boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: 367 }}>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", cursor: "pointer", marginBottom: 24, padding: 0, display: "flex", alignItems: "center", gap: 6, color: "#666", fontSize: 13 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>

        {/* Heading */}
        <h1 style={{ fontFamily: GARAMOND, fontSize: 26, fontWeight: 700, color: "#000", margin: "0 0 8px", lineHeight: 1.25, letterSpacing: "-0.2px" }}>
          Personalise your experience
        </h1>
        <p style={{ fontSize: 14, color: "#666", margin: "0 0 28px", lineHeight: 1.5 }}>
          What are your main goals? Pick all that apply.
        </p>

        {/* Goal options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {GOALS.map(goal => {
            const isOn = selected.includes(goal.id);
            return (
              <button
                key={goal.id}
                onClick={() => toggle(goal.id)}
                style={{
                  width: "100%", height: 44, borderRadius: 7,
                  border: isOn ? `1.5px solid ${ORANGE}` : "1px solid #959595",
                  background: isOn ? "#fff5f0" : "#fff",
                  color: "#000",
                  fontSize: 15, fontFamily: GARAMOND, fontWeight: 400,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0 14px",
                  transition: "border-color 0.12s, background 0.12s",
                  outline: "none",
                }}
              >
                <span>{goal.label}</span>
                {isOn && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Continue */}
        <button
          onClick={handleContinue}
          disabled={selected.length === 0 || saving}
          style={{
            width: "100%", height: 44, borderRadius: 7, border: "none",
            background: selected.length > 0 && !saving ? ORANGE : "#e5e7eb",
            color: selected.length > 0 && !saving ? "#fff" : "#9ca3af",
            fontSize: 15, fontFamily: GARAMOND, fontWeight: 400,
            cursor: selected.length > 0 && !saving ? "pointer" : "not-allowed",
            transition: "background 0.15s",
          }}
        >
          {saving ? "Setting up…" : "Continue"}
        </button>

        {/* Skip */}
        <button
          onClick={() => navigate("/chat", { replace: true })}
          style={{ width: "100%", background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer", marginTop: 14, textAlign: "center" }}
        >
          Skip for now
        </button>
      </div>

      {/* Bottom mark */}
      <div style={{ position: "absolute", bottom: 32, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <img src="/logo.svg" alt="" width={20} height={20} style={{ objectFit: "contain", opacity: 0.35 }} />
        <span style={{ fontFamily: GARAMOND, fontSize: 11, fontWeight: 600, color: "#000", letterSpacing: "0.3px", opacity: 0.5 }}>Productive Day</span>
      </div>
    </div>
  );
}
