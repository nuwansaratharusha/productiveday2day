import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Palette, RotateCcw } from "lucide-react";
import { MigrationBanner } from "@/lib/migration/MigrationBanner";
import { useDragReorder } from "@/hooks/useDragReorder";
import { usePlannerBlocks } from "@/lib/hooks/usePlannerBlocks";
import { Button } from "@/components/ui/button";
import { PlannerHeader } from "@/components/planner/PlannerHeader";
import { StatsBar } from "@/components/planner/StatsBar";
import { TimeBlock } from "@/components/planner/TimeBlock";
import { BlockDialog } from "@/components/planner/BlockDialog";
import { DayActionsBar } from "@/components/planner/DayActionsBar";
import { OnboardingWizard, OnboardingData } from "@/components/planner/OnboardingWizard";
import { AIPlannerChat } from "@/components/planner/AIPlannerChat";
import { CategoryManager } from "@/components/planner/CategoryManager";
import { BreakSuggestionCard } from "@/components/planner/BreakSuggestionCard";
import {
  TimeBlockData,
  DAYS,
  getCurrentTimeBlock,
  loadCategories,
  saveCategories,
  updateCategoriesRef,
  Category,
} from "@/data/plannerData";
import { generateSmartSchedule } from "@/lib/smartScheduleGenerator";
import { recalculateTimes } from "@/lib/scheduleGenerator";

// ── Helpers ───────────────────────────────────────────────────

function getSelectedDate(selectedDay: number, defaultDay: number): string {
  const today = new Date();
  const diff = selectedDay - defaultDay;
  const target = new Date(today);
  target.setDate(today.getDate() + diff);
  return target.toISOString().slice(0, 10);
}

// ── Skeleton block ───────────────────────────────────────────
function BlockSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="rounded-2xl border border-border/40 bg-card/50 p-3.5 mb-2 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className="w-1 h-10 rounded-full bg-muted/50 flex-shrink-0" />
        <div className="w-[18px] h-[18px] rounded-[5px] bg-muted/50 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-muted/50 rounded w-2/5" />
          <div className="h-2.5 bg-muted/30 rounded w-1/4" />
        </div>
        <div className="space-y-1.5 text-right">
          <div className="h-3 bg-muted/40 rounded w-12" />
          <div className="h-2.5 bg-muted/25 rounded w-8" />
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const today = new Date().getDay();
  const defaultDay = today === 0 ? 6 : today - 1; // Mon=0 … Sun=6
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const isWeekend = selectedDay >= 5;

  // Compute the actual calendar date for the selected day
  const selectedDate = useMemo(
    () => getSelectedDate(selectedDay, defaultDay),
    [selectedDay, defaultDay]
  );

  const [time, setTime] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlockData | null>(null);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [categories, setCategoriesState] = useState<Record<string, Category>>(loadCategories);

  const {
    blocks, completed, hasAnyBlocks, loading,
    saveBlocks, toggleComplete, bulkCreate, clearAllBlocks,
  } = usePlannerBlocks(selectedDate);

  // ── Onboarding / AI chat state ────────────────────────────────
  // "null"    = still loading
  // "ai"      = show AI chat (day has no blocks yet)
  // "classic" = show classic OnboardingWizard
  // "ready"   = show planner
  type PlannerMode = null | "ai" | "classic" | "ready";
  const [mode, setMode] = useState<PlannerMode>(null);
  const modeInitialised = useRef(false);

  // Set mode once after first load — don't react to hasAnyBlocks changes
  // (saves from AI chat must not auto-dismiss the chat)
  useEffect(() => {
    if (!loading && !modeInitialised.current) {
      modeInitialised.current = true;
      setMode(hasAnyBlocks ? "ready" : "ai");
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // AI planner: save blocks for today's date, keep chat open
  const handleAISaveBlocks = useCallback(
    async (blocks: TimeBlockData[]) => {
      await saveBlocks(blocks);
    },
    [saveBlocks],
  );

  // AI planner: user taps "Open Planner" → transition
  const handleAIViewPlanner = useCallback(() => {
    setMode("ready");
  }, []);

  // Classic onboarding
  const handleOnboardingComplete = useCallback(async (data: OnboardingData) => {
    const schedule = generateSmartSchedule(data);
    await bulkCreate(schedule);
    setMode("ready");
  }, [bulkCreate]);

  const handleResetOnboarding = useCallback(async () => {
    await clearAllBlocks();
    modeInitialised.current = false; // allow re-init on next load
    setMode("ai");
  }, [clearAllBlocks]);

  const handleCategorySave = (cats: Record<string, Category>) => {
    setCategoriesState(cats);
    saveCategories(cats);
    updateCategoriesRef(cats);
  };

  const activeIndex = selectedDay === defaultDay ? getCurrentTimeBlock(blocks) : -1;
  const activeBlock = activeIndex >= 0 ? blocks[activeIndex] : null;
  const isBreakActive =
    activeBlock?.block.toLowerCase().includes("break") &&
    !activeBlock?.block.toLowerCase().includes("breakfast");

  const updateBlocks = useCallback(
    (newBlocks: TimeBlockData[]) => saveBlocks(newBlocks),
    [saveBlocks]
  );

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newBlocks = [...blocks];
      const [moved] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, moved);
      updateBlocks(recalculateTimes(newBlocks));
    },
    [blocks, updateBlocks]
  );

  const {
    containerRef, dragState,
    handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = useDragReorder(blocks.length, handleReorder);

  const handleSave = (data: Omit<TimeBlockData, "id"> & { id?: string }) => {
    let newBlocks: TimeBlockData[];
    if (data.id) {
      // Editing existing block — preserve the user's manually set time exactly
      newBlocks = blocks.map((b) => b.id === data.id ? ({ ...b, ...data } as TimeBlockData) : b);
    } else {
      // Adding new block — append at end, no time recalculation
      newBlocks = [...blocks, { ...data, id: `block-${Date.now()}` } as TimeBlockData];
    }
    updateBlocks(newBlocks);
  };

  const handleDelete = (id: string) => {
    // Keep times as-is after deletion (don't cascade recalculate)
    updateBlocks(blocks.filter((b) => b.id !== id));
  };

  // Compute a smart default start time for new blocks:
  // If there are existing blocks, start right after the last one ends.
  const newBlockDefaultStart = useMemo(() => {
    if (blocks.length === 0) return "09:00";
    const last = blocks[blocks.length - 1];
    // Parse the last block's time to find its end
    const parts = last.time.split(/[–—-]/);
    if (parts.length < 2) {
      // Fallback: parse start + add duration
      const startParts = parts[0].trim().replace(/\s*(AM|PM)/i, "").split(":");
      const hStr = startParts[0] || "0";
      const mStr = startParts[1] || "0";
      const isPM = /PM/i.test(last.time) && parseInt(hStr, 10) !== 12;
      let h = parseInt(hStr, 10) + (isPM ? 12 : 0);
      const m = parseInt(mStr, 10);
      const endMins = h * 60 + m + last.dur;
      const eh = Math.floor((endMins % 1440) / 60);
      const em = endMins % 60;
      return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
    }
    // Parse end part "10:00 AM" → 24h
    const endRaw = parts[1].trim();
    const endPeriodMatch = endRaw.match(/(AM|PM)/i);
    const period = endPeriodMatch?.[0] || "AM";
    const num = endRaw.replace(/\s*(AM|PM)/i, "").trim();
    const [hS = "0", mS = "0"] = num.split(":");
    let h = parseInt(hS, 10);
    const m = parseInt(mS, 10);
    if (/PM/i.test(period) && h !== 12) h += 12;
    if (/AM/i.test(period) && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }, [blocks]);

  // ── Mode-based routing ─────────────────────────────────────────
  // Compute a human-readable date label for the AI chat header
  const aiDateLabel = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }, [selectedDate]);

  if (mode === null) {
    // Loading — show nothing (or a minimal skeleton)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (mode === "ai") {
    return (
      <AIPlannerChat
        onSaveBlocks={handleAISaveBlocks}
        onViewPlanner={handleAIViewPlanner}
        onUseClassic={() => setMode("classic")}
        dateLabel={aiDateLabel}
      />
    );
  }

  if (mode === "classic") {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PlannerHeader
        selectedDay={selectedDay}
        defaultDay={defaultDay}
        time={time}
        onSelectDay={setSelectedDay}
      />

      <MigrationBanner />

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-24">

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="col-span-2 h-28 rounded-2xl bg-card/40 border border-border/40 animate-pulse" />
            <div className="h-28 rounded-2xl bg-card/40 border border-border/40 animate-pulse" />
          </div>
        ) : (
          <StatsBar blocks={blocks} completed={completed} categories={categories} />
        )}

        {!loading && isBreakActive && activeBlock && (
          <BreakSuggestionCard blockName={activeBlock.block} />
        )}

        {/* Schedule section header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[12px] font-bold text-foreground">
              {isWeekend ? "Weekend" : "Weekday"}
              <span className="text-muted-foreground font-medium ml-1.5">— {DAYS[selectedDay]}</span>
            </span>
            {!loading && (
              <span className="text-[11px] text-muted-foreground ml-2">
                {blocks.length} blocks · {Math.round(blocks.reduce((s, b) => s + b.dur, 0) / 60)}h
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setCatManagerOpen(true)} title="Categories"
            >
              <Palette className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={handleResetOnboarding} title="Reset schedule"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Block list */}
        {loading ? (
          [0, 70, 140, 210, 280].map((d) => <BlockSkeleton key={d} delay={d} />)
        ) : (
          <div ref={containerRef}>
            {blocks.map((block, i) => (
              <TimeBlock
                key={block.id}
                block={block}
                index={i}
                isActive={i === activeIndex}
                completed={!!completed[block.id]}
                isDragging={dragState.dragIndex === i}
                isDropTarget={dragState.dropIndex === i}
                dropPosition={dragState.dropIndex === i ? dragState.dropPosition : null}
                onToggle={() => toggleComplete(block.id)}
                onEdit={() => { setEditingBlock(block); setDialogOpen(true); }}
                onDelete={() => handleDelete(block.id)}
                onDragStart={handleDragStart(i)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver(i)}
                onDragLeave={handleDragLeave(i)}
                onDrop={handleDrop(i)}
                onTouchStart={handleTouchStart(i)}
                onTouchMove={handleTouchMove(i)}
                onTouchEnd={handleTouchEnd(i)}
                categories={categories}
              />
            ))}
          </div>
        )}

        {!loading && <DayActionsBar blocks={blocks} completed={completed} selectedDay={selectedDay} />}
      </div>

      {/* Floating Add button */}
      {!loading && (
        <button
          onClick={() => { setEditingBlock(null); setDialogOpen(true); }}
          className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-2xl gradient-brand shadow-brand-lg
                     flex items-center justify-center text-white transition-all duration-200
                     hover:scale-105 active:scale-95 hover:shadow-brand"
          aria-label="Add block"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
        </button>
      )}

      <BlockDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        block={editingBlock} onSave={handleSave} categories={categories}
        defaultStartTime={newBlockDefaultStart}
      />

      <CategoryManager
        open={catManagerOpen} onOpenChange={setCatManagerOpen}
        categories={categories} onSave={handleCategorySave}
      />
    </div>
  );
}
