// =============================================================
// ProductiveDay — Shared Creator Layout + Sub-Navigation
// Gives all creator pages a unified, connected feel
// =============================================================

import { NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

const CREATOR_NAV = [
  { to: "/creator",          label: "Studio",   icon: "✦" },
  { to: "/creator/ideas",    label: "Ideas",    icon: "💡" },
  { to: "/creator/pipeline", label: "Pipeline", icon: "🎬" },
  { to: "/creator/scripts",  label: "Scripts",  icon: "✍️" },
];

export function CreatorLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Creator sub-nav */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {CREATOR_NAV.map(({ to, label, icon }) => {
              const isActive =
                to === "/creator"
                  ? location.pathname === "/creator"
                  : location.pathname.startsWith(to);

              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <span className="text-base leading-none">{icon}</span>
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
