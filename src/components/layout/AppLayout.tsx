// =============================================================
// ProductiveDay — App Layout with Bottom Nav
// =============================================================
import { NavLink, useLocation } from "react-router-dom";
import { CalendarDays, LayoutGrid, Flame, BarChart3, User, Clapperboard } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: LayoutGrid, label: "Planner" },
  { to: "/habits", icon: Flame, label: "Habits" },
  { to: "/creator", icon: Clapperboard, label: "Creator" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/profile", icon: User, label: "Profile" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  // Auth pages — no nav
  const hideNav = ["/login", "/signup", "/auth/callback"].includes(location.pathname);
  if (hideNav) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 backdrop-blur-xl safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isActive = to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(to);

            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className={cn("w-[18px] h-[18px]", isActive && "stroke-[2.2px]")} />
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium leading-none",
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
