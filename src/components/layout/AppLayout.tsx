// =============================================================
// ProductiveDay — App Layout with Bottom Nav (6-item mobile nav)
// =============================================================
import { NavLink, useLocation } from "react-router-dom";
import { CalendarDays, LayoutGrid, Flame, BarChart3, User, Clapperboard } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/",          icon: LayoutGrid,  label: "Planner"   },
  { to: "/habits",    icon: Flame,       label: "Habits"    },
  { to: "/creator",   icon: Clapperboard,label: "Creator"   },
  { to: "/analytics", icon: BarChart3,   label: "Analytics" },
  { to: "/calendar",  icon: CalendarDays,label: "Calendar"  },
  { to: "/profile",   icon: User,        label: "Profile"   },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  // Auth pages — no nav
  const hideNav = ["/login", "/signup", "/auth/callback"].includes(location.pathname);
  if (hideNav) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-[68px]">{children}</main>

      {/* Bottom navigation — 6 items, compact */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-center justify-around px-0 py-1.5 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isActive = to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(to);

            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 flex-1 py-1 rounded-lg transition-all duration-200 min-w-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "relative flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className={cn("w-[17px] h-[17px]", isActive && "stroke-[2.2px]")} />
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-medium leading-none truncate w-full text-center",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
