// =============================================================
// ProductiveDay — Planner Blocks Hook (Supabase-backed)
// =============================================================
// Uses useAuth() context — no duplicate getUser() network calls.
// Encoding convention (stored in `tags` column):
//   tags[0] = "planner-block"  (sentinel)
//   tags[1] = dayType          → "weekday" | "weekend"
//   tags[2] = timeStr          → "9:00 AM – 10:00 AM"
//   tags[3] = category         → "Personal"
// =============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import type { TimeBlockData } from "@/data/plannerData";
import type { TaskInsert } from "@/lib/types/database";

const PLANNER_TAG = "planner-block";

// ─── Helpers ──────────────────────────────────────────────────

function isToday(isoString: string | null): boolean {
  if (!isoString) return false;
  const d = new Date(isoString);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function taskToBlock(task: {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  tags: string[];
  status: string;
  completed_at: string | null;
}): TimeBlockData {
  const tags = task.tags || [];
  return {
    id: task.id,
    block: task.title,
    desc: task.description || "",
    dur: task.estimated_minutes || 30,
    time: tags[2] || "",
    cat: tags[3] || "Personal",
  };
}

function blockToInsert(
  block: TimeBlockData,
  dayType: "weekday" | "weekend",
  index: number,
  userId: string
): TaskInsert & { user_id: string } {
  return {
    title: block.block,
    description: block.desc || null,
    estimated_minutes: block.dur,
    tags: [PLANNER_TAG, dayType, block.time, block.cat],
    sort_order: index,
    status: "todo",
    user_id: userId,
  };
}

// ─── Hook ─────────────────────────────────────────────────────

export interface UsePlannerBlocksReturn {
  allBlocks: { weekday: TimeBlockData[]; weekend: TimeBlockData[] };
  completed: Record<string, boolean>;
  hasBlocks: boolean;
  loading: boolean;
  saveBlocks: (newBlocks: TimeBlockData[], dayType: "weekday" | "weekend") => Promise<void>;
  toggleComplete: (blockId: string) => Promise<void>;
  bulkCreate: (schedule: { weekday: TimeBlockData[]; weekend: TimeBlockData[] }) => Promise<void>;
}

export function usePlannerBlocks(): UsePlannerBlocksReturn {
  // Use auth context — no extra network request
  const { user } = useAuth();

  // Single supabase client instance
  const supabase = useMemo(() => createClient(), []);

  const [allBlocks, setAllBlocks] = useState<{ weekday: TimeBlockData[]; weekend: TimeBlockData[] }>(
    { weekday: [], weekend: [] }
  );
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const rowIds = useRef<{ weekday: Set<string>; weekend: Set<string> }>({
    weekday: new Set(),
    weekend: new Set(),
  });

  // ── Fetch ──────────────────────────────────────────────────
  const fetchBlocks = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, estimated_minutes, tags, status, completed_at, sort_order")
      .eq("user_id", user.id)
      .contains("tags", [PLANNER_TAG])
      .order("sort_order", { ascending: true });

    if (error || !data) { setLoading(false); return; }

    const weekdayBlocks: TimeBlockData[] = [];
    const weekendBlocks: TimeBlockData[] = [];
    const completedMap: Record<string, boolean> = {};
    const newRowIds = { weekday: new Set<string>(), weekend: new Set<string>() };

    for (const task of data) {
      const tags: string[] = task.tags || [];
      const dayType = tags[1]; // "weekday" | "weekend"
      const block = taskToBlock(task);

      if (dayType === "weekend") {
        weekendBlocks.push(block);
        newRowIds.weekend.add(task.id);
      } else {
        weekdayBlocks.push(block);
        newRowIds.weekday.add(task.id);
      }

      if (task.status === "done" && isToday(task.completed_at)) {
        completedMap[task.id] = true;
      }
    }

    rowIds.current = newRowIds;
    setAllBlocks({ weekday: weekdayBlocks, weekend: weekendBlocks });
    setCompleted(completedMap);
    setLoading(false);
  }, [user, supabase]);

  // Fetch when user becomes available
  useEffect(() => {
    if (user) {
      fetchBlocks();
    } else {
      setLoading(false);
    }
  }, [user, fetchBlocks]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`planner-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        fetchBlocks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, supabase, fetchBlocks]);

  // ── saveBlocks ─────────────────────────────────────────────
  const saveBlocks = useCallback(
    async (newBlocks: TimeBlockData[], dayType: "weekday" | "weekend") => {
      if (!user) return;

      // Optimistic update
      setAllBlocks((prev) => ({ ...prev, [dayType]: newBlocks }));

      const existingIds = rowIds.current[dayType];
      const incomingUUIDs = newBlocks.filter((b) => isUUID(b.id)).map((b) => b.id);

      // Delete removed rows
      const toDelete = [...existingIds].filter((id) => !incomingUUIDs.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("tasks").delete().in("id", toDelete).eq("user_id", user.id);
      }

      // Upsert each block
      const promises = newBlocks.map(async (block, i) => {
        if (isUUID(block.id)) {
          await supabase
            .from("tasks")
            .update({
              title: block.block,
              description: block.desc || null,
              estimated_minutes: block.dur,
              tags: [PLANNER_TAG, dayType, block.time, block.cat],
              sort_order: i,
            })
            .eq("id", block.id)
            .eq("user_id", user.id);
        } else {
          const { data: inserted } = await supabase
            .from("tasks")
            .insert(blockToInsert(block, dayType, i, user.id))
            .select("id")
            .single();

          if (inserted?.id) {
            const tempId = block.id;
            const realId = inserted.id;
            setAllBlocks((prev) => ({
              ...prev,
              [dayType]: prev[dayType].map((b) =>
                b.id === tempId ? { ...b, id: realId } : b
              ),
            }));
            rowIds.current[dayType].add(realId);
          }
        }
      });

      await Promise.all(promises);
      rowIds.current[dayType] = new Set(
        newBlocks.filter((b) => isUUID(b.id)).map((b) => b.id)
      );
    },
    [user, supabase]
  );

  // ── toggleComplete ─────────────────────────────────────────
  const toggleComplete = useCallback(
    async (blockId: string) => {
      if (!user) return;

      const currentlyDone = !!completed[blockId];

      // Optimistic update — instant UI response
      setCompleted((prev) => ({ ...prev, [blockId]: !currentlyDone }));

      if (isUUID(blockId)) {
        await supabase
          .from("tasks")
          .update({
            status: currentlyDone ? "todo" : "done",
            completed_at: currentlyDone ? null : new Date().toISOString(),
          })
          .eq("id", blockId)
          .eq("user_id", user.id);
      }
    },
    [user, supabase, completed]
  );

  // ── bulkCreate ─────────────────────────────────────────────
  const bulkCreate = useCallback(
    async (schedule: { weekday: TimeBlockData[]; weekend: TimeBlockData[] }) => {
      if (!user) return;

      setAllBlocks(schedule);

      const allInserts = [
        ...schedule.weekday.map((b, i) => blockToInsert(b, "weekday", i, user.id)),
        ...schedule.weekend.map((b, i) => blockToInsert(b, "weekend", i, user.id)),
      ];

      if (allInserts.length === 0) return;

      const { data: inserted } = await supabase
        .from("tasks")
        .insert(allInserts)
        .select("id, tags, sort_order");

      if (inserted) {
        const weekdayBlocks: TimeBlockData[] = [];
        const weekendBlocks: TimeBlockData[] = [];

        for (const row of inserted) {
          const tags: string[] = row.tags || [];
          const dayType = tags[1];
          const src =
            dayType === "weekend"
              ? schedule.weekend[row.sort_order]
              : schedule.weekday[row.sort_order];
          if (!src) continue;
          const block: TimeBlockData = { ...src, id: row.id };
          if (dayType === "weekend") weekendBlocks.push(block);
          else weekdayBlocks.push(block);
        }

        setAllBlocks({ weekday: weekdayBlocks, weekend: weekendBlocks });
        rowIds.current.weekday = new Set(weekdayBlocks.map((b) => b.id));
        rowIds.current.weekend = new Set(weekendBlocks.map((b) => b.id));
      }
    },
    [user, supabase]
  );

  const hasBlocks = allBlocks.weekday.length > 0 || allBlocks.weekend.length > 0;

  return { allBlocks, completed, hasBlocks, loading, saveBlocks, toggleComplete, bulkCreate };
}
