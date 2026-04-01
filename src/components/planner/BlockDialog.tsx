import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TimeBlockData, CATEGORIES } from "@/data/plannerData";

interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: TimeBlockData | null;
  onSave: (block: Omit<TimeBlockData, "id"> & { id?: string }) => void;
}

export function BlockDialog({ open, onOpenChange, block, onSave }: BlockDialogProps) {
  const [form, setForm] = useState({
    block: "",
    desc: "",
    time: "",
    cat: "Personal",
    dur: 30,
  });

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{block ? "Edit Block" : "Add Block"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Block Name</Label>
            <Input value={form.block} onChange={e => setForm(p => ({ ...p, block: e.target.value }))} placeholder="e.g. Deep Work" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} placeholder="What you'll focus on" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Time Range</Label>
              <Input value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} placeholder="9:00–10:00" />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" value={form.dur} onChange={e => setForm(p => ({ ...p, dur: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.cat} onValueChange={v => setForm(p => ({ ...p, cat: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(CATEGORIES).map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORIES[cat].icon} {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} className="w-full gradient-brand text-primary-foreground font-semibold">
            {block ? "Save Changes" : "Add Block"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
