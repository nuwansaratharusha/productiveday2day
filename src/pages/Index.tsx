import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Palette, RotateCcw, Bell } from "lucide-react";
import { GoogleCalendarSync } from "@/components/planner/GoogleCalendarSync";
import { FocusMode, isLearningBlock } from "@/components/planner/FocusMode";
import {
  getCalToken,
  syncBlocksToCalendar,
  setEventComplete,
  deleteCalendarEvent,
} from "@/lib/googleCalendar";
import { useNavContext } from "@/lib/context/NavContext";
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
    <div style={{
      borderRadius: 12, border: "1px solid #f0f0f0",
      background: "#fafafa", padding: "14px 14px",
      marginBottom: 8, display: "flex", alignItems: "center", gap: 12,
      animation: "pulse 1.5s ease-in-out infinite",
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ width: 3, height: 36, borderRadius: 2, background: "#efefef", flexShrink: 0 }} />
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#efefef", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 12, background: "#efefef", borderRadius: 4, width: "40%", marginBottom: 6 }} />
        <div style={{ height: 10, background: "#f5f5f5", borderRadius: 4, width: "20%" }} />
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ height: 12, background: "#efefef", borderRadius: 4, width: 48, marginBottom: 4 }} />
        <div style={{ height: 10, background: "#f5f5f5", borderRadius: 4, width: 32 }} />
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
  const [focusActive, setFocusActive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Persist profession at onboarding so focus mode can read it later
  const profession = typeof localStorage !== "undefined"
    ? (localStorage.getItem("pd-profession") ?? "")
    : "";
  const [editingBlock, setEditingBlock] = useState<TimeBlockData | null>(null);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [categories, setCategoriesState] = useState<Record<string, Category>>(loadCategories);

  const {
    blocks, completed, hasAnyBlocks, loading,
    saveBlocks, replaceDayBlocks, toggleComplete, bulkCreate, clearAllBlocks,
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

  // ── Hide bottom nav during AI chat / onboarding ───────────────
  const { setHideNav } = useNavContext();
  useEffect(() => {
    const shouldHide = mode === "ai" || mode === "classic";
    setHideNav(shouldHide);
    return () => setHideNav(false);
  }, [mode, setHideNav]);

  // ── Browser notifications for time-slot transitions ───────────
  // Parse the end time of a block's time string → minutes since midnight
  function parseBlockEndMins(timeStr: string): number | null {
    const parts = timeStr.split(/[–—-]/);
    if (parts.length < 2) return null;
    const endRaw = parts[1].trim();
    const ampmMatch = endRaw.match(/(AM|PM)/i);
    if (!ampmMatch) return null;
    const period = ampmMatch[1].toUpperCase();
    const num = endRaw.replace(/\s*(AM|PM)/i, "").trim();
    const [hStr = "0", mStr = "0"] = num.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return isNaN(h) || isNaN(m) ? null : h * 60 + m;
  }

  const notifiedRef = useRef<Set<string>>(new Set());
  // Reset fired notifications at midnight
  useEffect(() => {
    const d = new Date();
    const msUntilMidnight =
      new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - d.getTime();
    const t = setTimeout(() => { notifiedRef.current = new Set(); }, msUntilMidnight);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (mode !== "ready" || blocks.length === 0) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    // Only fire for today's planner
    if (selectedDay !== defaultDay) return;

    const currentMins = time.getHours() * 60 + time.getMinutes();

    blocks.forEach((block, i) => {
      const endMins = parseBlockEndMins(block.time);
      if (endMins === null) return;
      const key = `${selectedDate}-${block.id}-${endMins}`;
      if (notifiedRef.current.has(key)) return;
      if (currentMins === endMins) {
        notifiedRef.current.add(key);
        const nextBlock = blocks[i + 1];
        try {
          new Notification("⏰ Time to switch!", {
            body: nextBlock
              ? `Next up: ${nextBlock.block}`
              : "That's the last block — great work today! 🎉",
            icon: "/favicon.ico",
            tag: key,
          });
        } catch { /* notifications not available */ }
      }
    });
  }, [time, blocks, mode, selectedDay, defaultDay, selectedDate]);

  // Request notification permission (shown as a small bell button in the planner)
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const requestNotifPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }, []);

  // AI planner: atomically replace the day's blocks — no duplicates possible.
  // After Supabase confirms the inserts (real UUIDs returned), sync to Google Calendar.
  const handleAISaveBlocks = useCallback(
    async (incomingBlocks: TimeBlockData[]) => {
      const savedBlocks = await replaceDayBlocks(incomingBlocks);
      if (getCalToken() && savedBlocks.length > 0) {
        syncBlocksToCalendar(savedBlocks, selectedDate).catch(() => {});
      }
    },
    [replaceDayBlocks, selectedDate],
  );

  // AI planner: user taps "Open Planner" → transition
  const handleAIViewPlanner = useCallback(() => {
    setMode("ready");
  }, []);

  // Classic onboarding — persist profession for focus mode
  const handleOnboardingComplete = useCallback(async (data: OnboardingData) => {
    try { localStorage.setItem("pd-profession", data.profession); } catch {}
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

  // Wrap toggleComplete to also update Google Calendar event status
  const handleToggleComplete = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      const currentlyDone = !!completed[blockId];
      toggleComplete(blockId);
      if (block && getCalToken()) {
        setEventComplete(blockId, block.block, !currentlyDone).catch(() => {});
      }
    },
    [blocks, completed, toggleComplete],
  );

  const activeIndex = selectedDay === defaultDay ? getCurrentTimeBlock(blocks) : -1;
  const activeBlock = activeIndex >= 0 ? blocks[activeIndex] : null;
  const isBreakActive =
    activeBlock?.block.toLowerCase().includes("break") &&
    !activeBlock?.block.toLowerCase().includes("breakfast");

  // Focus mode: student profession + active learning block
  const isStudent = profession === "student";
  const showFocusEntry = isStudent && activeBlock && isLearningBlock(activeBlock) && !focusActive;

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
    // Delete from Google Calendar if connected (best-effort, non-blocking)
    if (getCalToken()) deleteCalendarEvent(id).catch(() => {});
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
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <svg style={{ width: 28, height: 28, animation: "spin 0.8s linear infinite" }} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#f0f0f0" strokeWidth="3" />
          <path d="M12 2a10 10 0 0110 10" stroke="#FF5C00" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#fff", display: "flex", flexDirection: "column" }}>

      {/* ── Focus Mode overlay (student + learning block) ─────── */}
      {focusActive && activeBlock && (
        <FocusMode
          block={activeBlock}
          onEndSession={() => setFocusActive(false)}
        />
      )}

      <PlannerHeader
        selectedDay={selectedDay}
        defaultDay={defaultDay}
        time={time}
        onSelectDay={setSelectedDay}
        blocksCompleted={Object.values(completed).filter(Boolean).length}
        blocksTotal={blocks.length}
      />

      <MigrationBanner />

      <div style={{ padding: "0 28px 100px" }}>

        {!loading && isBreakActive && activeBlock && (
          <BreakSuggestionCard blockName={activeBlock.block} />
        )}

        {/* Focus Mode entry banner — student + active learning block */}
        {!loading && showFocusEntry && activeBlock && (
          <button
            onClick={() => setFocusActive(true)}
            className="w-full mb-4 flex items-center gap-3 bg-primary/8 border border-primary/25
                       rounded-2xl px-4 py-3.5 text-left hover:bg-primary/12 active:scale-[0.99]
                       transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0
                            group-hover:bg-primary/20 transition-colors">
              <span className="text-[18px]">📚</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-primary leading-tight">
                Study block active — enter Focus Mode
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Lock this screen so you stay on track
              </p>
            </div>
            <div className="text-primary/60 text-[11px] font-medium bg-primary/10 px-2.5 py-1 rounded-lg
                            group-hover:bg-primary/20 transition-colors flex-shrink-0">
              Start →
            </div>
          </button>
        )}

        {/* ── Utility toolbar (minimal, top-right of blocks area) ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginBottom: 12 }}>
          <GoogleCalendarSync
            onConnected={() => { if (blocks.length > 0) syncBlocksToCalendar(blocks, selectedDate).catch(() => {}); }}
            onSyncNow={() => { if (blocks.length > 0) syncBlocksToCalendar(blocks, selectedDate).catch(() => {}); }}
          />
          {notifPermission !== "granted" && notifPermission !== "denied" && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={requestNotifPermission} title="Enable time-slot alerts">
              <Bell className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => setCatManagerOpen(true)} title="Categories">
            <Palette className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={handleResetOnboarding} title="Reset schedule">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
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
                onToggle={() => handleToggleComplete(block.id)}
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

      {/* ── Floating Add button ───────────────────────────── */}
      {!loading && (
        <button
          onClick={() => { setEditingBlock(null); setDialogOpen(true); }}
          aria-label="Add block"
          style={{
            position: "fixed",
            bottom: 28, right: 28,
            zIndex: 40,
            width: 50, height: 50,
            borderRadius: "50%",
            border: "none",
            background: `linear-gradient(135deg, #FF8040, #FF5C00)`,
            color: "#fff",
            boxShadow: "0 4px 20px rgba(255,92,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "transform 0.18s, box-shadow 0.18s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.09)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(255,92,0,0.55)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(255,92,0,0.45)";
          }}
          onMouseDown={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)"}
          onMouseUp={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.09)"}
        >
          <Plus style={{ width: 22, height: 22, strokeWidth: 2.5 }} />
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
