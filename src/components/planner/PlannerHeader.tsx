import { useState } from "react";
import { DAYS } from "@/data/plannerData";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/components/auth/AuthProvider";

interface PlannerHeaderProps {
  selectedDay: number;
  defaultDay: number;
  time: Date;
  onSelectDay: (day: number) => void;
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Short day labels with date numbers for the tab strip
function getDayTabLabel(dayIndex: number) {
  const today = new Date();
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0
  const diff = dayIndex - todayDow;
  const target = new Date(today);
  target.setDate(today.getDate() + diff);
  return {
    short: DAYS[dayIndex].slice(0, 3),
    num: target.getDate(),
  };
}

export function PlannerHeader({ selectedDay, defaultDay, time, onSelectDay }: PlannerHeaderProps) {
  const { user } = useAuth();
  const [use24h, setUse24h] = useState(false);
  const hour = time.getHours();
  const greeting = getGreeting(hour);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0]
    || user?.email?.split("@")[0]
    || "";

  const timeStr = use24h
    ? time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })   // 24h: "14:30"
    : time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });  // 12h: "2:30 PM"
  const dateStr = time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">

        {/* Top row: greeting + time + user */}
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground leading-none mb-0.5">
              {greeting}{firstName ? `, ${firstName}` : ""}
            </p>
            <h1 className="text-[17px] font-bold text-foreground leading-tight tracking-tight truncate">
              {dateStr}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Live clock pill — click to toggle 12h / 24h */}
            <button
              onClick={() => setUse24h((v) => !v)}
              title={use24h ? "Switch to 12h format" : "Switch to 24h format"}
              className="flex items-center gap-1.5 bg-muted/60 border border-border/50 px-3 py-1.5 rounded-full
                         cursor-pointer hover:bg-muted/80 hover:border-border active:scale-95 transition-all duration-150
                         select-none"
            >
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              <span className="text-[12px] font-bold tabular-nums text-foreground">{timeStr}</span>
            </button>
            <UserMenu />
          </div>
        </div>

        {/* Day tab strip */}
        <div className="flex gap-0.5 bg-muted/40 p-1 rounded-xl border border-border/30">
          {DAYS.map((_, i) => {
            const { short, num } = getDayTabLabel(i);
            const isSelected = selectedDay === i;
            const isToday = i === defaultDay;

            return (
              <button
                key={i}
                onClick={() => onSelectDay(i)}
                className={[
                  "flex-1 flex flex-col items-center py-2.5 rounded-[10px] transition-all duration-200 relative",
                  isSelected
                    ? "bg-card shadow-sm"
                    : "hover:bg-card/50",
                ].join(" ")}
              >
                <span className={[
                  "text-[9px] font-semibold uppercase tracking-wider leading-none mb-1",
                  isSelected ? "text-muted-foreground" : isToday ? "text-primary" : "text-muted-foreground/60",
                ].join(" ")}>
                  {short}
                </span>
                <span className={[
                  "text-[14px] font-bold leading-none",
                  isSelected ? "text-foreground" : isToday ? "text-primary" : "text-muted-foreground/50",
                ].join(" ")}>
                  {num}
                </span>
                {/* Today indicator dot */}
                {isToday && (
                  <span className={[
                    "absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full transition-all",
                    isSelected ? "w-1.5 h-1.5 bg-primary shadow-sm" : "w-1 h-1 bg-primary/60",
                  ].join(" ")} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
