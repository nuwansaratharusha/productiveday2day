// =============================================================
// ProductiveDay — Onboarding: "What you going to use this platform for?"
// Matches Figma design exactly:
//   - Bold Apple Garamond heading
//   - Full-width stacked buttons (44px, rx=7)
//   - White+border for active; #DCDCDC for disabled (coming soon)
//   - Orange (#FF5C00) Custom button
//   - "Productive Day" mark at bottom
// =============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";

const GARAMOND = `"Apple Garamond", "Apple Garamond Light", "EB Garamond", Garamond, Georgia, serif`;
const ORANGE   = "#FF5C00";

const OPTIONS = [
  { id: "creator",  label: "Content Creator",   available: true  },
  { id: "student",  label: "Student",            available: true  },
  { id: "health",   label: "Health",             available: false },
  { id: "fitness",  label: "Fitness Enthusiast", available: false },
];

export default function OnboardingPage() {
  const [saving, setSaving] = useState(false);
  const navigate            = useNavigate();
  const supabase            = createClient();

  async function proceed(userType: string) {
    if (saving) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .upsert({ id: user.id, user_type: userType }, { onConflict: "id" })
        .then(() => {});
    }
    // Navigate to personalization next
    navigate("/onboarding/personalize", { replace: false, state: { userType } });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 24px 40px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
      boxSizing: "border-box",
    }}>

      {/* Content block */}
      <div style={{ width: "100%", maxWidth: 367 }}>

        {/* Heading */}
        <h1 style={{
          fontFamily: GARAMOND,
          fontSize: 26,
          fontWeight: 700,
          color: "#000",
          textAlign: "center",
          margin: "0 0 32px",
          lineHeight: 1.25,
          letterSpacing: "-0.2px",
        }}>
          What you going to use this platform for?
        </h1>

        {/* Option buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => opt.available && proceed(opt.id)}
              disabled={!opt.available || saving}
              style={{
                position: "relative",
                width: "100%",
                height: 44,
                borderRadius: 7,
                border: opt.available ? "1px solid #959595" : "1px solid #DCDCDC",
                background: opt.available ? "#fff" : "#DCDCDC",
                color: opt.available ? "#000" : "#888",
                fontSize: 14,
                fontWeight: 400,
                cursor: opt.available && !saving ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.12s, border-color 0.12s",
                outline: "none",
                padding: 0,
              }}
              onMouseEnter={e => {
                if (opt.available && !saving) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f9f9f9";
                }
              }}
              onMouseLeave={e => {
                if (opt.available) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                }
              }}
            >
              {/* Label */}
              <span style={{ fontFamily: GARAMOND, fontSize: 15, fontWeight: 400 }}>
                {opt.label}
              </span>

              {/* Coming soon badge */}
              {!opt.available && (
                <span style={{
                  position: "absolute",
                  top: -6,
                  right: 6,
                  background: "#000",
                  color: "#fff",
                  fontSize: 8,
                  fontWeight: 500,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
                  borderRadius: 3,
                  padding: "2px 6px",
                  letterSpacing: "0.3px",
                  lineHeight: "12px",
                  whiteSpace: "nowrap",
                }}>
                  coming soon
                </span>
              )}
            </button>
          ))}

          {/* Custom — orange filled */}
          <button
            onClick={() => proceed("custom")}
            disabled={saving}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 7,
              border: "none",
              background: saving ? "#ff8040" : ORANGE,
              color: "#fff",
              fontSize: 15,
              fontFamily: GARAMOND,
              fontWeight: 400,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.12s",
              outline: "none",
              marginTop: 2,
            }}
            onMouseEnter={e => {
              if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#e05200";
            }}
            onMouseLeave={e => {
              if (!saving) (e.currentTarget as HTMLButtonElement).style.background = ORANGE;
            }}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Bottom — Productive Day mark */}
      <div style={{
        position: "absolute",
        bottom: 32,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}>
        <img src="/logo.svg" alt="" width={20} height={20} style={{ objectFit: "contain", opacity: 0.35 }} />
        <span style={{
          fontFamily: GARAMOND,
          fontSize: 11,
          fontWeight: 600,
          color: "#000",
          letterSpacing: "0.3px",
          opacity: 0.5,
        }}>
          Productive Day
        </span>
      </div>

      {/* Loading overlay while saving */}
      {saving && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(255,255,255,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg style={{ width: 24, height: 24, animation: "spin 0.8s linear infinite" }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#ddd" strokeWidth="3" />
            <path d="M12 2a10 10 0 0110 10" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
