import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TimeBlockData, Category, DEFAULT_CATEGORIES } from "@/data/plannerData";
import { Clock, Tag, AlignLeft, Timer } from "lucide-react";
import { IconByKey } from "@/lib/categoryIcons";

interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: TimeBlockData | null;
  onSave: (block: Omit<TimeBlockData, "id"> & { id?: string }) => void;
  categories?: Record<string, Category>;
  defaultStartTime?: string; // "HH:MM" 24h — used when adding a new block
}

// ── Time helpers ──────────────────────────────────────────────────

/** "HH:MM" (24h) → total minutes */
function t24ToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/** total minutes → "HH:MM" (24h, clamped to 0-1439) */
function minsToT24(mins: number): string {
  const clamped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** total minutes → "H:MM AM/PM" */
function minsToAMPM(totalMins: number): string {
  const clamped = ((totalMins % 1440) + 1440) % 1440;
  const h24 = Math.floor(clamped / 60);
  const m = clamped % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Build the "H:MM–H:MM AM/PM" string stored in block.time */
function buildTimeStr(startT24: string, endT24: string): string {
  const startMins = t24ToMins(startT24);
  const endMins   = t24ToMins(endT24);
  const startStr  = minsToAMPM(startMins);
  const endStr    = minsToAMPM(endMins);
  const sPeriod   = startStr.slice(-2);
  const ePeriod   = endStr.slice(-2);
  if (sPeriod === ePeriod) {
    return `${startStr.replace(/ (AM|PM)$/, "")}–${endStr}`;
  }
  return `${startStr}–${endStr}`;
}

/**
 * Parse "9:00–10:00 AM" or "9:00 AM–10:00 AM" or "9:00-10:00 AM"
 * (handles en-dash, em-dash, and plain hyphen) → { start: "09:00", end: "10:00" } (24h)
 */
function parseBlockTime(timeStr: string): { start: string; end: string } {
  if (!timeStr) return { start: "09:00", end: "10:00" };

  // Accept en-dash (–), em-dash (—), or plain hyphen-minus as separator
  const parts = timeStr.split(/\s*[–—]\s*|\s*-\s*/);
  if (parts.length < 2) return { start: "09:00", end: "10:00" };

  const startRaw = parts[0].trim();
  const endRaw   = parts[1].trim();

  const endPeriod   = (endRaw.match(/(AM|PM)/i)   || ["", "AM"])[1];
  const startPeriod = (startRaw.match(/(AM|PM)/i)  || ["", endPeriod])[1];

  function toT24(raw: string, period: string): string {
    const num  = raw.replace(/\s*(AM|PM)/i, "").trim();
    const [hS = "0", mS = "0"] = num.split(":");
    let h = parseInt(hS, 10);
    const m = parseInt(mS, 10);
    if (isNaN(h) || isNaN(m)) return "00:00";
    if (/PM/i.test(period) && h !== 12) h += 12;
    if (/AM/i.test(period) && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return {
    start: toT24(startRaw, startPeriod),
    end:   toT24(endRaw,   endPeriod),
  };
}

// ── Component ─────────────────────────────────────────────────────

export function BlockDialog({
  open, onOpenChange, block, onSave, categories, defaultStartTime = "09:00",
}: BlockDialogProps) {
  const cats = categories || DEFAULT_CATEGORIES;

  const [name, setName]           = useState("");
  const [desc, setDesc]           = useState("");
  const [startT, setStartT]       = useState("09:00");
  const [endT, setEndT]           = useState("10:00");
  const [dur, setDur]             = useState(60);
  const [cat, setCat]             = useState("Personal");

  // Populate form when dialog opens
  useEffect(() => {
    if (block) {
      const { start, end } = parseBlockTime(block.time);
      const durCalc = Math.max(5, t24ToMins(end) - t24ToMins(start));
      setName(block.block);
      setDesc(block.desc || "");
      setStartT(start);
      setEndT(end);
      setDur(durCalc);
      setCat(block.cat);
    } else {
      setName("");
      setDesc("");
      setStartT(defaultStartTime);
      setEndT(minsToT24(t24ToMins(defaultStartTime) + 60));
      setDur(60);
      setCat("Personal");
    }
  }, [block, open, defaultStartTime]);

  // ── Sync helpers ───────────────────────────────────────────────

  const onStartChange = (val: string) => {
    setStartT(val);
    setEndT(minsToT24(t24ToMins(val) + dur));
  };

  const onEndChange = (val: string) => {
    setEndT(val);
    const d = Math.max(5, t24ToMins(val) - t24ToMins(startT));
    setDur(d);
  };

  const onDurChange = (val: number) => {
    if (isNaN(val) || val < 1) return;
    setDur(val);
    setEndT(minsToT24(t24ToMins(startT) + val));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id:    block?.id,
      block: name.trim(),
      desc:  desc.trim(),
      time:  buildTimeStr(startT, endT),
      dur,
      cat,
    });
    onOpenChange(false);
  };

  const selectedCat = cats[cat];
  const previewTime = buildTimeStr(startT, endT);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border shadow-card-hover">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base font-bold">
            {block ? "Edit Block" : "Add Time Block"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">

          {/* Block name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Block Name
            </Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Read the Book"
              className="h-10 rounded-xl border-border text-sm font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft className="w-3 h-3" /> Description
            </Label>
            <Input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="What will you focus on?"
              className="h-10 rounded-xl border-border text-sm"
            />
          </div>

          {/* Time pickers */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Time
            </Label>

            {/* Start + End side by side */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Start</p>
                <input
                  type="time"
                  value={startT}
                  onChange={e => onStartChange(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">End</p>
                <input
                  type="time"
                  value={endT}
                  onChange={e => onEndChange(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Duration + preview */}
            <div className="flex items-center gap-2">
              <Timer className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground">Duration</span>
              <input
                type="number"
                min="5"
                max="480"
                value={dur}
                onChange={e => onDurChange(Number(e.target.value))}
                className="w-14 h-7 rounded-lg border border-border bg-background px-2 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <span className="text-[11px] text-muted-foreground">min</span>
              {/* Live preview */}
              <span className="ml-auto text-[11px] font-semibold text-primary">{previewTime}</span>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Category
            </Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="h-10 rounded-xl border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {Object.entries(cats).map(([catName, catData]) => (
                  <SelectItem key={catName} value={catName} className="rounded-lg">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: catData.accent }}
                      />
                      <IconByKey iconKey={catData.icon} className="w-3 h-3" strokeWidth={2} />
                      {catName}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCat && (
              <div
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold mt-1"
                style={{ background: selectedCat.color, color: selectedCat.accent }}
              >
                <IconByKey iconKey={selectedCat.icon} className="w-2.5 h-2.5" strokeWidth={2} /> {cat}
              </div>
            )}
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full h-11 gradient-brand text-primary-foreground font-semibold rounded-xl border-0 text-sm mt-1"
          >
            {block ? "Save Changes" : "Add Block"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
