import { TimeBlockData, CATEGORIES } from "@/data/plannerData";
import { Check, Pencil, Trash2, GripVertical } from "lucide-react";

interface TimeBlockProps {
  block: TimeBlockData;
  isActive: boolean;
  completed: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  dropPosition?: "above" | "below" | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function TimeBlock({
  block, isActive, completed, onToggle, onEdit, onDelete,
  isDragging, isDropTarget, dropPosition,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onTouchStart, onTouchMove, onTouchEnd,
}: TimeBlockProps) {
  const cat = CATEGORIES[block.cat] || CATEGORIES.Personal;

  return (
    <div
      className={`group flex items-stretch rounded-xl overflow-hidden mb-2 cursor-pointer transition-all duration-200 relative bg-card ${
        isDragging ? "opacity-40 scale-[0.97]" : ""
      } ${
        isActive
          ? "ring-2 ring-primary shadow-lg shadow-primary/10"
          : "border border-border hover:border-primary/30 hover:shadow-sm"
      } ${completed ? "opacity-50" : ""}`}
      onClick={onToggle}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDropTarget && dropPosition === "above" && (
        <div className="absolute -top-[2px] left-0 right-0 h-[3px] gradient-brand rounded-full z-10" />
      )}
      {isDropTarget && dropPosition === "below" && (
        <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] gradient-brand rounded-full z-10" />
      )}

      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 gradient-brand animate-pulse-active" />
      )}

      <div
        className="flex items-center justify-center w-7 flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="w-1 flex-shrink-0" style={{ background: cat.accent }} />
      <div className="py-3 px-4 flex-1 flex items-center gap-3.5">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors"
          style={{
            border: completed ? "none" : `2px solid ${cat.accent}`,
            background: completed ? cat.accent : "transparent",
            color: completed ? "white" : "transparent",
          }}
        >
          {completed && <Check className="w-3 h-3" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-sm text-card-foreground ${completed ? "line-through" : ""}`}>
              {block.block}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
              style={{ background: cat.color, color: cat.accent }}
            >
              {cat.icon} {block.cat}
            </span>
            {isActive && (
              <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold tracking-wider animate-pulse-active">
                NOW
              </span>
            )}
          </div>
          <div className={`text-xs text-muted-foreground mt-0.5 ${completed ? "line-through" : ""}`}>
            {block.desc}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs font-bold text-card-foreground">{block.time}</div>
          <div className="text-[11px] text-muted-foreground">{block.dur} min</div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
