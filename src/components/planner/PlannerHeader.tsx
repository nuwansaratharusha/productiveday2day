import { DAYS } from "@/data/plannerData";
import zipLogo from "@/assets/zip-logo.png";
import { Clock } from "lucide-react";

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
    <header className="bg-card border-b border-border sticky top-0 z-20 shadow-card">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-0">

        {/* Top row: logo + date/time */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 shadow-card">
              <img src={zipLogo} alt="ZIP" className="h-[14px] invert brightness-200" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground tracking-tight leading-none">ZIP</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                Daily Operating System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/70 px-3 py-1.5 rounded-full">
            <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground font-medium">{dateStr}</span>
            <span className="text-[11px] text-foreground font-bold">{timeStr}</span>
          </div>
        </div>

        {/* Day selector tabs */}
        <div className="flex gap-0.5 bg-muted/60 p-1 rounded-xl">
          {DAYS.map((day, i) => {
            const isSelected = selectedDay === i;
            const isToday = i === defaultDay;
            return (
              <button
                key={day}
                onClick={() => onSelectDay(i)}
                className={`
                  flex-1 py-2 rounded-[10px] text-[11px] font-semibold transition-all duration-200 relative
                  ${isSelected
                    ? "bg-card text-foreground shadow-card font-bold"
                    : isToday
                    ? "text-primary hover:bg-card/70 hover:text-primary"
                    : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                  }
                `}
              >
                {day}
                {isToday && (
                  <span
                    className={`absolute bottom-[5px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full ${
                      isSelected ? "gradient-brand" : "bg-primary"
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
