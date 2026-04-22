// =============================================================
// ProductiveDay — New App Layout
// Matches Figma: left 64px icon sidebar + full-width top bar
// Orange AI circle pinned to sidebar bottom → /chat
// Auth + onboarding pages: no layout (full-screen)
// Mobile: bottom nav fallback (4 icons + AI circle)
// =============================================================
import { NavLink, useLocation } from "react-router-dom";
import { LayoutGrid, Flame, CalendarDays, User } from "lucide-react";
import type { ReactNode } from "react";

const ORANGE = "#FF5C00";

// Pages that bypass layout entirely
const NO_LAYOUT_PATHS = [
  "/login", "/signup", "/auth/callback",
  "/onboarding", "/onboarding/personalize",
];

const NAV_ITEMS = [
  { to: "/",         Icon: LayoutGrid   },
  { to: "/habits",   Icon: Flame        },
  { to: "/calendar", Icon: CalendarDays },
  { to: "/profile",  Icon: User         },
];

function SidebarIcon({ to, Icon, pathname }: { to: string; Icon: typeof LayoutGrid; pathname: string }) {
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  return (
    <NavLink to={to} style={{ textDecoration: "none" }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "#fff2ec" : "transparent",
        transition: "background .15s",
      }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "#fafafa"; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
      >
        <Icon size={20} color={active ? ORANGE : "#111"} strokeWidth={active ? 2.2 : 1.6} />
      </div>
    </NavLink>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const path     = location.pathname;

  // ── No layout for auth / onboarding ──────────────────────────
  if (NO_LAYOUT_PATHS.includes(path)) return <>{children}</>;

  const isChatActive = path === "/chat" || path.startsWith("/chat");

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", overflow: "hidden",
      background: "#fff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    }}>

      {/* ── Top header (full width) ──────────────────────────── */}
      <header style={{
        height: 56, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 20px 0 16px",
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
        zIndex: 50,
      }}>
        <img src="/logo.svg" alt="Productive Day" width={28} height={28}
          style={{ objectFit: "contain", marginRight: 10, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111", letterSpacing: "-0.2px" }}>
          Productive Day
        </span>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left sidebar (desktop) ───────────────────────────── */}
        <nav className="pd-sidebar" style={{
          width: 64, flexShrink: 0,
          borderRight: "1px solid #e5e7eb",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 16,
          paddingBottom: 20,
          gap: 0,
        }}>
          {/* Nav icons — stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {NAV_ITEMS.map(({ to, Icon }) => (
              <SidebarIcon key={to} to={to} Icon={Icon} pathname={path} />
            ))}
          </div>

          {/* AI Chat circle — pinned to bottom */}
          <div style={{ marginTop: "auto" }}>
            <NavLink to="/chat" style={{ textDecoration: "none" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: ORANGE,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: isChatActive
                  ? "0 0 0 4px rgba(255,92,0,0.18), 0 4px 14px rgba(255,92,0,0.4)"
                  : "0 4px 12px rgba(255,92,0,0.3)",
                transition: "box-shadow .2s, transform .15s",
                transform: isChatActive ? "scale(1.07)" : "scale(1)",
              }}>
                {/* Sparkle / AI icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"/>
                </svg>
              </div>
            </NavLink>
          </div>
        </nav>

        {/* ── Main content area ──────────────────────────────── */}
        <main style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}>
          {children}
        </main>
      </div>

      {/* ── Bottom nav (mobile only, via CSS) ──────────────── */}
      <nav className="pd-bottom-nav" style={{
        display: "none",
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: 60,
        background: "#fff",
        borderTop: "1px solid #e5e7eb",
        alignItems: "center",
        justifyContent: "space-around",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 100,
      }}>
        {NAV_ITEMS.map(({ to, Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <NavLink key={to} to={to} style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44 }}>
              <Icon size={22} color={active ? ORANGE : "#9ca3af"} strokeWidth={active ? 2.2 : 1.5} />
            </NavLink>
          );
        })}
        <NavLink to="/chat" style={{ textDecoration: "none" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: isChatActive ? "#cc3d00" : ORANGE,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 3px 10px rgba(255,92,0,0.3)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"/>
            </svg>
          </div>
        </NavLink>
      </nav>

      <style>{`
        @media (max-width: 767px) {
          .pd-sidebar     { display: none !important; }
          .pd-bottom-nav  { display: flex !important; }
          main            { padding-bottom: 60px; overflow-y: auto !important; }
        }
      `}</style>
    </div>
  );
}
