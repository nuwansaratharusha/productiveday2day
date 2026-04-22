// =============================================================
// ProductiveDay — AI Chat Interface
// Matches Figma exactly:
//   Home state: orange orb + "Good Morning!" + quick-starts
//   Chat state: user bubble (orange) + AI schedule response
//   Input bar: left orange accent line + send button
//   "Refine your plan or open the planner →" footer link
// Uses new AppLayout sidebar (no additional layout needed)
// =============================================================
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const GARAMOND = `"Apple Garamond", "Apple Garamond Light", "EB Garamond", Garamond, Georgia, serif`;
const ORANGE   = "#FF5C00";

// ── Time-based greeting ───────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning!";
  if (h < 17) return "Good Afternoon!";
  return "Good Evening!";
}

// ── Quick-start rows (Figma: icon + text + ">") ───────────────
const QUICK_STARTS = [
  { icon: "/icons/settings.svg",  text: "Client work + lecture + recording"  },
  { icon: "/icons/sparkle.svg",   text: "Deep focus morning, standup & gym"  },
  { icon: "/icons/bulb.svg",      text: "Design sprint + manager 1:1"        },
];

// ── Schedule row type ─────────────────────────────────────────
type Row = { dot: string; time: string; label: string };

// ── Message types ─────────────────────────────────────────────
type Msg =
  | { role: "user"; text: string }
  | { role: "ai";   text: string; rows?: Row[]; saved?: number; ready?: boolean };

// ── Demo schedule builder ─────────────────────────────────────
function buildReply(input: string): Msg {
  return {
    role: "ai",
    text: `Here's your optimised day, inspired by your goals, with a focus on completing your key work, as well as incorporating learning, creative, and personal activities.`,
    rows: [
      { dot: "#22c55e", time: "6:30–7:00 AM",     label: "Morning Routine"        },
      { dot: "#22c55e", time: "7:00–8:00 AM",     label: "Reading Time"           },
      { dot: "#f59e0b", time: "8:00–9:30 AM",     label: "CIM Lectures"           },
      { dot: "#FF5C00", time: "9:30–9:45 AM",     label: "Short Break"            },
      { dot: "#ef4444", time: "9:45 AM–12:15 PM", label: "Main Project Work"      },
      { dot: "#22c55e", time: "12:15–1:00 PM",    label: "Lunch Break"            },
      { dot: "#3b82f6", time: "1:00–2:30 PM",     label: "Skool Strategic Course" },
      { dot: "#FF5C00", time: "2:30–2:45 PM",     label: "Short Break"            },
    ],
    saved: 16,
    ready: true,
  };
}

// ── Orange orb ────────────────────────────────────────────────
function Orb() {
  return (
    <div style={{
      width: 80, height: 80, borderRadius: "50%",
      background: "radial-gradient(circle at 38% 32%, #FF9050 0%, #FF5C00 55%, #D44000 100%)",
      boxShadow: "0 6px 28px rgba(255,92,0,0.38)",
      flexShrink: 0,
      marginBottom: 28,
    }} />
  );
}

// ── AI avatar circle ──────────────────────────────────────────
function AiAvatar({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "radial-gradient(circle at 38% 32%, #FF9050 0%, #FF5C00 55%, #D44000 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width={size * 0.48} height={size * 0.48} viewBox="0 0 24 24" fill="white">
        <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"/>
      </svg>
    </div>
  );
}

// ── Schedule card ─────────────────────────────────────────────
function ScheduleCard({ rows, saved, ready }: { rows: Row[]; saved?: number; ready?: boolean }) {
  const navigate = useNavigate();
  const visible  = rows.slice(0, 8);
  const extra    = rows.length - visible.length;
  return (
    <div style={{ width: "100%", maxWidth: 700, marginTop: 10 }}>
      <div style={{
        border: "1px solid #e5e7eb", borderRadius: 10,
        overflow: "hidden", background: "#fff",
      }}>
        {visible.map((r, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "9px 18px",
            borderBottom: i < visible.length - 1 ? "1px solid #f3f4f6" : "none",
          }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: r.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#6b7280", width: 138, flexShrink: 0 }}>{r.time}</span>
            <span style={{ fontSize: 13, color: "#111" }}>{r.label}</span>
          </div>
        ))}
        {extra > 0 && (
          <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", padding: "8px 0", margin: 0 }}>
            +{extra} more blocks
          </p>
        )}
      </div>

      {saved && (
        <p style={{ fontSize: 13, color: "#22c55e", fontWeight: 500, margin: "10px 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          {saved} blocks saved to your planer
        </p>
      )}

      {ready && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#fff3f0", border: "1px solid #ffd0bc",
          borderRadius: 10, padding: "11px 16px",
        }}>
          <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: ORANGE, fontWeight: 500 }}>Your plan is ready!</span>
            <span style={{ fontSize: 16 }}>🎯</span>
            <span style={{ color: "#666" }}>Refine it or open the planner.</span>
          </span>
          <button
            onClick={() => navigate("/")}
            style={{
              height: 34, padding: "0 18px", borderRadius: 7, border: "none",
              background: ORANGE, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", flexShrink: 0, marginLeft: 12,
            }}
          >
            Open →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AIChatPage() {
  const [msgs,    setMsgs]    = useState<Msg[]>([]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);
  const navigate              = useNavigate();
  const isHome                = msgs.length === 0;

  useEffect(() => {
    if (!isHome) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, isHome]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    inputRef.current?.focus();
    setMsgs(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setMsgs(prev => [...prev, buildReply(msg)]);
    setLoading(false);
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", background: "#fff", position: "relative",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    }}>

      {/* ── Scrollable area ─────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        paddingBottom: 90,
        display: "flex",
        flexDirection: "column",
        alignItems: isHome ? "center" : "stretch",
        justifyContent: isHome ? "center" : "flex-start",
      }}>

        {/* ════════════ HOME STATE ════════════════════════════ */}
        {isHome && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "40px 24px 20px",
            maxWidth: 560, width: "100%", margin: "0 auto",
          }}>
            <Orb />

            <h1 style={{
              fontFamily: GARAMOND,
              fontSize: "clamp(34px, 4.5vw, 52px)",
              fontWeight: 700,
              color: "#000",
              margin: "0 0 14px",
              textAlign: "center",
              letterSpacing: "-0.5px",
              lineHeight: 1.15,
            }}>
              {greeting()}
            </h1>

            <p style={{
              fontSize: 15, color: "#666",
              textAlign: "center", lineHeight: 1.65,
              margin: "0 0 36px", maxWidth: 400,
            }}>
              Tell me what's on your plate and I'll build an<br />
              optimised time-blocked schedule for today.
            </p>

            {/* Try a quick start */}
            <p style={{ fontSize: 12, color: "#bbb", marginBottom: 14, letterSpacing: "0.2px" }}>
              Try a quick start
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              {QUICK_STARTS.map((qs, i) => (
                <button key={i} onClick={() => send(qs.text)} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "13px 16px",
                  border: "1px solid #e5e7eb", borderRadius: 10,
                  background: "#fff", cursor: "pointer", textAlign: "left",
                  transition: "border-color .12s, background .12s",
                  outline: "none",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fafafa"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; }}
                >
                  <img src={qs.icon} alt="" width={18} height={18}
                    style={{ opacity: 0.65, flexShrink: 0 }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                  <span style={{ flex: 1, fontSize: 14, color: "#222" }}>{qs.text}</span>
                  <span style={{ fontSize: 14, color: "#bbb" }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ════════════ CHAT STATE ════════════════════════════ */}
        {!isHome && (
          <div style={{ padding: "28px 40px 0", display: "flex", flexDirection: "column", gap: 20 }}>
            {msgs.map((msg, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 12, alignItems: "flex-start",
              }}>
                {msg.role === "ai" && <AiAvatar size={32} />}

                <div style={{ maxWidth: msg.role === "user" ? "70%" : "88%", display: "flex", flexDirection: "column" }}>
                  <div style={{
                    background: msg.role === "user" ? ORANGE : "transparent",
                    color: msg.role === "user" ? "#fff" : "#111",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : 0,
                    padding: msg.role === "user" ? "11px 16px" : 0,
                    fontSize: 14, lineHeight: 1.6,
                  }}>
                    {msg.text}
                  </div>
                  {msg.role === "ai" && msg.rows && (
                    <ScheduleCard rows={msg.rows} saved={msg.saved} ready={msg.ready} />
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <AiAvatar size={32} />
                <div style={{ background: "#f3f4f6", borderRadius: "16px 16px 16px 4px", padding: "12px 18px", display: "flex", gap: 5 }}>
                  {[0, 1, 2].map(j => (
                    <span key={j} style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#bbb", display: "block",
                      animation: `aiDot 1s ease-in-out ${j * 0.16}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar (pinned to bottom) ─────────────────────── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "#fff",
        padding: "10px 24px 12px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {/* Input row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center",
            border: "1px solid #e5e7eb",
            borderLeft: `3px solid ${input.length > 0 ? ORANGE : "#e5e7eb"}`,
            borderRadius: 10,
            background: "#fafafa",
            height: 48,
            padding: "0 14px",
            transition: "border-left-color .2s",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}}
              placeholder={isHome ? "Describe your tasks, meetings and goals…" : "Adjust your plan - e.g. move client work to afternoon"}
              style={{
                flex: 1, border: "none", background: "transparent",
                fontSize: 14, color: "#111", outline: "none",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 44, height: 44, borderRadius: "50%", border: "none",
              background: input.trim() && !loading ? ORANGE : "#e9e9e9",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              flexShrink: 0,
              transition: "background .15s",
            }}
          >
            {/* Paper plane icon matching Figma */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={input.trim() && !loading ? "#fff" : "#bbb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>

        {/* "open the planner" link */}
        <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
          Refine your plan or{" "}
          <button
            onClick={() => navigate("/")}
            style={{ background: "none", border: "none", color: ORANGE, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 500 }}
          >
            open the planner →
          </button>
        </p>
      </div>

      <style>{`
        @keyframes aiDot {
          0%, 60%, 100% { transform: translateY(0);   opacity: .6; }
          30%            { transform: translateY(-5px); opacity: 1;  }
        }
      `}</style>
    </div>
  );
}
