import { DAYS } from "@/data/plannerData";
import zipLogo from "@/assets/zip-logo.png";

interface PlannerHeaderProps {
  selectedDay: number;
  defaultDay: number;
  time: Date;
  onSelectDay: (day: number) => void;
}

export function PlannerHeader({ selectedDay, defaultDay, time, onSelectDay }: PlannerHeaderProps) {
  return (
    <div className="gradient-header px-5 pt-6 pb-5">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <img src={zipLogo} alt="ZIP" className="h-7 invert brightness-200" />
          <span className="text-sm text-muted-foreground font-normal">
            Daily Operating System
          </span>
        </div>
        <div className="text-xs text-muted-foreground mb-5">
          Year 1 — {time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} — {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>

        <div className="flex gap-1.5">
          {DAYS.map((day, i) => (
            <button
              key={day}
              onClick={() => onSelectDay(i)}
              className={`flex-1 py-2 rounded-lg border-none cursor-pointer text-sm font-medium transition-all duration-200 ${
                selectedDay === i
                  ? "gradient-brand text-primary-foreground font-extrabold"
                  : i === defaultDay
                  ? "bg-muted/10 text-secondary"
                  : "bg-transparent text-muted-foreground"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
