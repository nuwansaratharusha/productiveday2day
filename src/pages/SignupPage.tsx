// =============================================================
// ProductiveDay — Sign Up Page  (Figma: "Sign Up" frame)
// Split layout: orange gradient panel left, form right
// Heading font: Apple Garamond / EB Garamond
// =============================================================
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";

const GARAMOND = `"Apple Garamond", "Apple Garamond Light", "EB Garamond", Garamond, Georgia, serif`;

function BrandMark({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.82)} viewBox="0 0 52 43" fill="none">
      <path d="M0 43V11L26 30L52 11V43H44V21L26 36L8 21V43H0Z" fill="#F4541A" />
      <rect x="0" y="37" width="52" height="6" rx="1" fill="#F4541A" opacity="0.35" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function SignupPage() {
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    const email    = formData.get("email")    as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;

    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Check your email to confirm your account!");
      setTimeout(() => navigate("/login"), 4000);
    }
    setLoading(false);
  }

  async function handleOAuth(provider: "google" | "github") {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  return (
    <div style={{
      display: "flex", minHeight: "100vh", background: "#fff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    }}>

      {/* ── Left: orange gradient panel ────────────────────── */}
      <div style={{
        display: "none",
        flex: "0 0 50%",
        padding: "26px 0 26px 26px",
      }} className="auth-left-panel">
        <div style={{
          width: "100%", height: "100%",
          borderRadius: 28,
          background: "linear-gradient(160deg, #F4541A 0%, #F47040 28%, #F49A6A 58%, #FAC8A8 100%)",
          boxShadow: "0 24px 60px rgba(244,84,26,0.28)",
        }} />
      </div>

      {/* ── Right: form ────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        minWidth: 0,
      }}>
        <div style={{ width: "100%", maxWidth: 368 }}>

          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <BrandMark size={52} />
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: GARAMOND,
            fontSize: 38,
            fontWeight: 400,
            letterSpacing: "-0.5px",
            textAlign: "center",
            margin: "0 0 28px",
            color: "#111",
            lineHeight: 1.15,
          }}>
            Start your Journey
          </h1>

          {/* Alerts */}
          {error && (
            <div style={{
              padding: "10px 14px", marginBottom: 16, borderRadius: 8,
              background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13,
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              padding: "10px 14px", marginBottom: 16, borderRadius: 8,
              background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontSize: 13,
            }}>
              {success}
            </div>
          )}

          {/* Google */}
          <button
            onClick={() => handleOAuth("google")}
            disabled={loading}
            style={{
              width: "100%", height: 46, borderRadius: 8, marginBottom: 10,
              border: "1.5px solid #e5e7eb", background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontSize: 14, fontWeight: 500, color: "#111", cursor: "pointer",
              transition: "background .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* GitHub */}
          <button
            onClick={() => handleOAuth("github")}
            disabled={loading}
            style={{
              width: "100%", height: 46, borderRadius: 8, marginBottom: 20,
              border: "none", background: "#111",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontSize: 14, fontWeight: 500, color: "#fff", cursor: "pointer",
              transition: "background .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#222")}
            onMouseLeave={e => (e.currentTarget.style.background = "#111")}
          >
            <GitHubIcon />
            Continue with GitHub
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            <span style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
              or sign up with email
            </span>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {[
              { name: "fullName", type: "text",     placeholder: "Full Name",  required: true },
              { name: "email",    type: "email",    placeholder: "Email",      required: true },
              { name: "password", type: "password", placeholder: "Password",   required: true, minLength: 8 },
            ].map((field, i, arr) => (
              <input
                key={field.name}
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                required={field.required}
                minLength={(field as { minLength?: number }).minLength}
                style={{
                  width: "100%", height: 46, borderRadius: 8,
                  marginBottom: i === arr.length - 1 ? 20 : 10,
                  border: "1.5px solid #e5e7eb", padding: "0 14px",
                  fontSize: 14, color: "#111", outline: "none",
                  boxSizing: "border-box", background: "#fff",
                  transition: "border-color .15s",
                }}
                onFocus={e => (e.target.style.borderColor = "#F4541A")}
                onBlur={e  => (e.target.style.borderColor = "#e5e7eb")}
              />
            ))}

            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", height: 46, borderRadius: 8, border: "none",
                background: loading ? "#F4541Aaa" : "#F4541A",
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background .15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Creating account…
                </>
              ) : "Sign Up"}
            </button>
          </form>

          {/* Footer */}
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#6b7280" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#F4541A", fontWeight: 500, textDecoration: "none" }}>
              Sign In
            </Link>
          </p>

        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .auth-left-panel { display: flex !important; }
        }
        input::placeholder { color: #9ca3af; }
      `}</style>
    </div>
  );
}
