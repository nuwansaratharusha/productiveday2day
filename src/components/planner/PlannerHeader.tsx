import { DAYS } from "@/data/plannerData";
import zipLogo from "@/assets/zip-logo.png";
import { UserMenu } from "@/components/auth/UserMenu";

interface PlannerHeaderProps {
  selectedDay: number;
  defaultDay: number;
  time: Date;
  onSelectDay: (day: number) => void;
}

export function PlannerHeader({ selectedDay, defaultDay, time, onSelectDay }: PlannerHeaderProps) {
  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header
      className="sticky top-0 z-20 border-b border-border/60"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
      }}
    >
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-0">

        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {/* Animated brand logo */}
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 shadow-brand animate-float">
              <img src={zipLogo} alt="ZIP" className="h-[15px] invert brightness-200" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground tracking-tight leading-none">ZIP</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                Daily Operating System
              </p>
            </div>
          </div>

          {/* Right side: clock + user menu */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-muted/80 px-3 py-1.5 rounded-full border border-border/50 animate-slide-right">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">{dateStr}</span>
              <span className="text-[11px] text-foreground font-bold tabular-nums">{timeStr}</span>
            </div>
            <UserMenu />
          </div>
        </div>

        {/* Day selector */}
        <div className="flex gap-0.5 bg-muted/50 p-1 rounded-xl border border-border/30">
          {DAYS.map((day, i) => {
            const isSelected = selectedDay === i;
            const isToday = i === defaultDay;
            return (
              <button
                key={day}
                onClick={() => onSelectDay(i)}
                className={`
                  flex-1 py-2 rounded-[10px] text-[11px] font-semibold
                  transition-all duration-250 relative overflow-hidden
                  ${isSelected
                    ? "bg-card text-foreground shadow-card font-bold"
                    : isToday
                    ? "text-primary hover:bg-card/60"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                  }
                `}
                style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}
              >
                {/* Selected indicator fills behind text */}
                {isSelected && (
                  <span className="absolute inset-0 rounded-[10px] bg-card" style={{ zIndex: -1 }} />
                )}
                {day}
                {/* Today dot */}
                {isToday && (
                  <span
                    className={`absolute bottom-[4px] left-1/2 -translate-x-1/2 rounded-full transition-all duration-300 ${
                      isSelected
                        ? "w-[6px] h-[6px] gradient-brand shadow-brand"
                        : "w-[4px] h-[4px] bg-primary opacity-70"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
