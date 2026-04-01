import { useState } from "react";
import { Sun, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WakeUpSetupProps {
  onConfirm: (wakeUpTime: string) => void;
}

const PRESETS = [
  { label: "5:00 AM", value: "05:00" },
  { label: "5:30 AM", value: "05:30" },
  { label: "6:00 AM", value: "06:00" },
  { label: "6:30 AM", value: "06:30" },
  { label: "7:00 AM", value: "07:00" },
  { label: "7:30 AM", value: "07:30" },
  { label: "8:00 AM", value: "08:00" },
  { label: "8:30 AM", value: "08:30" },
];

export function WakeUpSetup({ onConfirm }: WakeUpSetupProps) {
  const [selected, setSelected] = useState("06:00");

  const formatDisplay = (val: string) => {
    const [h, m] = val.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-5">
            <Sun className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mb-2">
            Good Morning!
          </h1>
          <p className="text-muted-foreground text-sm">
            When do you wake up? We'll build your perfect day around it.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
            Wake-up Time
          </label>

          <div className="grid grid-cols-4 gap-2 mb-5">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setSelected(p.value)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  selected === p.value
                    ? "gradient-brand text-primary-foreground scale-[1.03] shadow-md"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground font-medium">or custom</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <input
            type="time"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full h-12 rounded-xl border border-input bg-background px-4 text-lg font-bold text-foreground text-center focus:outline-none focus:ring-2 focus:ring-ring mb-5"
          />

          <div className="text-center text-sm text-muted-foreground mb-5">
            Your day starts at <span className="font-bold text-foreground">{formatDisplay(selected)}</span>
          </div>

          <Button
            onClick={() => onConfirm(selected)}
            className="w-full h-12 gradient-brand text-primary-foreground font-bold text-sm gap-2 border-0 rounded-xl"
          >
            Build My Schedule
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-5">
          <span className="font-bold text-primary">ZIP Solutions</span> — The Art of Hospitality
        </p>
      </div>
    </div>
  );
}
