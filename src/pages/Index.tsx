import { useState, useEffect, useCallback } from "react";
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

// ─── Skeleton block loader ──────────────────────────────────
function BlockSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-3.5 mb-2 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-muted/60 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-muted/60 rounded w-2/5" />
          <div className="h-3 bg-muted/40 rounded w-1/4" />
        </div>
        <div className="h-3 bg-muted/40 rounded w-12" />
      </div>
    </div>
  );
}

export default function Index() {
  const today = new Date().getDay();
  const defaultDay = today === 0 ? 6 : today - 1;
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const isWeekend = selectedDay >= 5;

  const [time, setTime] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlockData | null>(null);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [categories, setCategoriesState] = useState<Record<string, Category>>(loadCategories);

  // ── Supabase-backed planner state ───────────────────────────
  const {
    allBlocks,
    completed,
    hasBlocks,
    loading,
    saveBlocks,
    toggleComplete,
    bulkCreate,
  } = usePlannerBlocks();

  // Onboarded = has blocks in Supabase (resolved after first data load)
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading) {
      setOnboarded(hasBlocks);
    }
  }, [loading, hasBlocks]);

  const blocks = isWeekend ? allBlocks.weekend : allBlocks.weekday;
  const dayType: "weekday" | "weekend" = isWeekend ? "weekend" : "weekday";

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Onboarding ──────────────────────────────────────────────
  const handleOnboardingComplete = useCallback(
    async (data: OnboardingData) => {
      const schedule = generateSmartSchedule(data);
      await bulkCreate(schedule);
      setOnboarded(true);
    },
    [bulkCreate]
  );

  const handleResetOnboarding = useCallback(async () => {
    await saveBlocks([], "weekday");
    await saveBlocks([], "weekend");
    setOnboarded(false);
  }, [saveBlocks]);

  // ── Categories ──────────────────────────────────────────────
  const handleCategorySave = (cats: Record<string, Category>) => {
    setCategoriesState(cats);
    saveCategories(cats);
    updateCategoriesRef(cats);
  };

  // ── Active block detection ──────────────────────────────────
  const activeIndex = selectedDay === defaultDay ? getCurrentTimeBlock(blocks) : -1;
  const activeBlock = activeIndex >= 0 ? blocks[activeIndex] : null;
  const isBreakActive =
    activeBlock?.block.toLowerCase().includes("break") &&
    !activeBlock?.block.toLowerCase().includes("breakfast");

  // ── Block mutations ─────────────────────────────────────────
  const updateBlocks = useCallback(
    (newBlocks: TimeBlockData[]) => saveBlocks(newBlocks, dayType),
    [saveBlocks, dayType]
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
    containerRef,
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDragReorder(blocks.length, handleReorder);

  const handleSave = (data: Omit<TimeBlockData, "id"> & { id?: string }) => {
    let newBlocks: TimeBlockData[];
    if (data.id) {
      newBlocks = blocks.map((b) =>
        b.id === data.id ? ({ ...b, ...data } as TimeBlockData) : b
      );
    } else {
      const newBlock: TimeBlockData = { ...data, id: `block-${Date.now()}` } as TimeBlockData;
      newBlocks = [...blocks, newBlock];
    }
    updateBlocks(recalculateTimes(newBlocks));
  };

  const handleDelete = (id: string) => {
    updateBlocks(recalculateTimes(blocks.filter((b) => b.id !== id)));
  };

  // ── Onboarding gate ─────────────────────────────────────────
  if (onboarded === false) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  // ── Main layout (shows skeleton while loading) ──────────────
  return (
    <div className="min-h-screen bg-background">
      <PlannerHeader
        selectedDay={selectedDay}
        defaultDay={defaultDay}
        time={time}
        onSelectDay={setSelectedDay}
      />

      <MigrationBanner />

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-12">
        {/* Stats bar — show skeleton placeholders while loading */}
        {loading ? (
          <div className="rounded-xl border border-border/40 bg-card/30 p-3 mb-5 animate-pulse">
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-1 space-y-1">
                  <div className="h-5 bg-muted/60 rounded w-8" />
                  <div className="h-3 bg-muted/40 rounded w-14" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <StatsBar blocks={blocks} completed={completed} categories={categories} />
        )}

        {!loading && isBreakActive && activeBlock && (
          <BreakSuggestionCard blockName={activeBlock.block} />
        )}

        {/* Schedule header */}
        <div className="flex justify-between items-center mb-3 px-0.5">
          <div>
            <span className="text-[12px] font-bold text-foreground">
              {isWeekend ? "Weekend" : "Weekday"} — {DAYS[selectedDay]}
            </span>
            {!loading && (
              <span className="text-[11px] text-muted-foreground ml-2">
                {blocks.length} blocks ·{" "}
                {Math.round(blocks.reduce((s, b) => s + b.dur, 0) / 60)}h
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setCatManagerOpen(true)}
              title="Manage Categories"
            >
              <Palette className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={handleResetOnboarding}
              title="Reset & Re-do Onboarding"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs font-semibold rounded-lg ml-1 px-3"
              onClick={() => {
                setEditingBlock(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Block
            </Button>
          </div>
        </div>

        {/* Block list — skeleton while loading */}
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => <BlockSkeleton key={i} />)}
          </>
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
                onEdit={() => {
                  setEditingBlock(block);
                  setDialogOpen(true);
                }}
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

        {!loading && (
          <DayActionsBar
            blocks={blocks}
            completed={completed}
            selectedDay={selectedDay}
          />
        )}
      </div>

      <BlockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        block={editingBlock}
        onSave={handleSave}
        categories={categories}
      />

      <CategoryManager
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
        categories={categories}
        onSave={handleCategorySave}
      />
    </div>
  );
}
