import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TimeBlockData, Category, DEFAULT_CATEGORIES } from "@/data/plannerData";
import { Clock, Tag, AlignLeft, Timer } from "lucide-react";

interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: TimeBlockData | null;
  onSave: (block: Omit<TimeBlockData, "id"> & { id?: string }) => void;
  categories?: Record<string, Category>;
}

export function BlockDialog({ open, onOpenChange, block, onSave, categories }: BlockDialogProps) {
  const cats = categories || DEFAULT_CATEGORIES;
  const [form, setForm] = useState({ block: "", desc: "", time: "", cat: "Personal", dur: 30 });

  useEffect(() => {
    if (block) {
      setForm({ block: block.block, desc: block.desc, time: block.time, cat: block.cat, dur: block.dur });
    } else {
      setForm({ block: "", desc: "", time: "", cat: "Personal", dur: 30 });
    }
  }, [block, open]);

  const handleSave = () => {
    if (!form.block || !form.time) return;
    onSave({ ...form, id: block?.id });
    onOpenChange(false);
  };

  const selectedCat = cats[form.cat];

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
              value={form.block}
              onChange={e => setForm(p => ({ ...p, block: e.target.value }))}
              placeholder="e.g. Deep Work Session"
              className="h-10 rounded-xl border-border text-sm font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft className="w-3 h-3" /> Description
            </Label>
            <Input
              value={form.desc}
              onChange={e => setForm(p => ({ ...p, desc: e.target.value }))}
              placeholder="What will you focus on?"
              className="h-10 rounded-xl border-border text-sm"
            />
          </div>

          {/* Time + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Time Range
              </Label>
              <Input
                value={form.time}
                onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                placeholder="9:00–10:00 AM"
                className="h-10 rounded-xl border-border text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Timer className="w-3 h-3" /> Duration (min)
              </Label>
              <Input
                type="number"
                value={form.dur}
                onChange={e => setForm(p => ({ ...p, dur: Number(e.target.value) }))}
                className="h-10 rounded-xl border-border text-sm"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Category
            </Label>
            <Select value={form.cat} onValueChange={v => setForm(p => ({ ...p, cat: v }))}>
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
                      {catData.icon} {catName}
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
                {selectedCat.icon} {form.cat}
              </div>
            )}
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={!form.block || !form.time}
            className="w-full h-11 gradient-brand text-primary-foreground font-semibold rounded-xl border-0 text-sm mt-1"
          >
            {block ? "Save Changes" : "Add Block"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
