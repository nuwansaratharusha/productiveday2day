// =============================================================
// ProductiveDay — Google Calendar integration
// =============================================================
// Uses the Google Identity Services (GIS) token model — no backend
// needed, no gapi.js required. The GIS script is loaded on demand
// when the user first presses "Connect Google Calendar".
//
// Flow:
//   1. User clicks Connect → GIS OAuth popup → access_token stored in localStorage
//   2. AI generates blocks → replaceDayBlocks → createCalendarEvents(savedBlocks)
//   3. User checks block done → setEventComplete(id, title, true)
//   4. User deletes block → deleteCalendarEvent(id)
// =============================================================

import type { TimeBlockData } from "@/data/plannerData";

// ── Constants ─────────────────────────────────────────────────

const CAL_SCOPE  = "https://www.googleapis.com/auth/calendar.events";
const CAL_BASE   = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TOKEN_KEY  = "pd-gcal-token";
const MAP_PREFIX = "pd-gcal-eid-";  // maps blockId → calEventId

// ── GIS loader ────────────────────────────────────────────────

let _gisLoading: Promise<void> | null = null;

function loadGIS(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (_gisLoading) return _gisLoading;

  _gisLoading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return _gisLoading;
}

// ── Token helpers ─────────────────────────────────────────────

export function getCalToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function saveCalToken(t: string) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch {}
}

export function clearCalToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

// ── Event-ID map (blockId ↔ calEventId) ──────────────────────

function saveEventId(blockId: string, evId: string) {
  try { localStorage.setItem(MAP_PREFIX + blockId, evId); } catch {}
}

function getEventId(blockId: string): string | null {
  try { return localStorage.getItem(MAP_PREFIX + blockId); } catch { return null; }
}

function removeEventId(blockId: string) {
  try { localStorage.removeItem(MAP_PREFIX + blockId); } catch {}
}

// ── OAuth connect ─────────────────────────────────────────────

export async function connectGoogleCalendar(clientId: string): Promise<void> {
  await loadGIS();

  return new Promise<void>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope:     CAL_SCOPE,
      callback:  (resp) => {
        if (resp.error) {
          reject(new Error(resp.error_description ?? resp.error));
        } else {
          saveCalToken(resp.access_token);
          resolve();
        }
      },
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

export function disconnectGoogleCalendar() {
  const token = getCalToken();
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token);
  }
  clearCalToken();
}

// ── Time parser ───────────────────────────────────────────────
// Handles both formats produced by makeRange():
//   "7:00–8:00 AM"     (same-period — AM/PM only on end)
//   "10:45 AM–12:15 PM" (cross-period — AM/PM on both)

function parseBlockTimes(
  timeStr: string,
  dateStr: string,
): { start: string; end: string } | null {
  // Split on en-dash, em-dash, or regular hyphen (with optional surrounding spaces)
  const parts = timeStr.split(/\s*[–—\-]\s*/);
  if (parts.length !== 2) return null;

  // Extract period from end segment to use as fallback for start
  const endPeriod = (parts[1].trim().match(/(AM|PM)\s*$/i)?.[1] ?? "").toUpperCase();

  const parseOne = (t: string, fallbackPeriod: string): string | null => {
    const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!m) return null;
    let h = parseInt(m[1]);
    const min = parseInt(m[2] ?? "0");
    const period = (m[3] ?? fallbackPeriod).toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h  = 0;
    return `${dateStr}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
  };

  const start = parseOne(parts[0], endPeriod);
  const end   = parseOne(parts[1], endPeriod);
  return start && end ? { start, end } : null;
}

// ── Category → Google Calendar colorId ───────────────────────
// See https://developers.google.com/calendar/api/v3/reference/colors

function categoryColorId(cat: string): string {
  const map: Record<string, string> = {
    Health:          "2",   // Sage
    Learning:        "9",   // Blueberry
    Revenue:         "11",  // Tomato
    Creative:        "3",   // Grape
    Personal:        "5",   // Banana
    Product:         "1",   // Lavender
    Operations:      "8",   // Graphite
    Delivery:        "2",   // Sage
    Branding:        "6",   // Flamingo
    "Side Projects": "4",   // Tangerine
    CIM:             "5",   // Banana
    Networking:      "7",   // Peacock
  };
  return map[cat] ?? "0";
}

// ── Calendar fetch wrapper ────────────────────────────────────

async function calFetch(
  method: string,
  url: string,
  body?: object,
): Promise<Response> {
  const token = getCalToken();
  if (!token) throw new Error("Not connected to Google Calendar");

  const res = await fetch(url, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token expired — clear it so UI can prompt re-connect
  if (res.status === 401) clearCalToken();
  return res;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Create a Google Calendar event for a single time block.
 * Stores the mapping blockId → calEventId in localStorage.
 */
export async function createCalendarEvent(
  block: TimeBlockData,
  dateStr: string,
): Promise<void> {
  const times = parseBlockTimes(block.time, dateStr);
  if (!times) return; // Couldn't parse time — skip silently

  // Already synced — don't create a duplicate
  if (getEventId(block.id)) return;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const event = {
    summary:     block.block,
    description: block.desc
      ? `${block.desc}\n\nCategory: ${block.cat} · via ProductiveDay`
      : `Category: ${block.cat} · via ProductiveDay`,
    start:   { dateTime: times.start, timeZone: tz },
    end:     { dateTime: times.end,   timeZone: tz },
    colorId: categoryColorId(block.cat),
    extendedProperties: {
      private: {
        "pd-block-id":  block.id,
        "pd-category":  block.cat,
      },
    },
  };

  try {
    const res = await calFetch("POST", CAL_BASE, event);
    if (res.ok) {
      const data = (await res.json()) as { id?: string };
      if (data.id) saveEventId(block.id, data.id);
    }
  } catch { /* fail silently — calendar sync is best-effort */ }
}

/**
 * Batch-create events for all blocks in a day.
 * Fires in parallel; individual failures don't break others.
 */
export async function syncBlocksToCalendar(
  blocks: TimeBlockData[],
  dateStr: string,
): Promise<void> {
  await Promise.allSettled(blocks.map((b) => createCalendarEvent(b, dateStr)));
}

/**
 * Mark a Calendar event complete (prepend ✅) or revert.
 */
export async function setEventComplete(
  blockId: string,
  title: string,
  done: boolean,
): Promise<void> {
  const evId = getEventId(blockId);
  if (!evId) return;

  const newTitle = done
    ? `✅ ${title.replace(/^✅\s*/, "")}`
    : title.replace(/^✅\s*/, "");

  try {
    await calFetch("PATCH", `${CAL_BASE}/${evId}`, { summary: newTitle });
  } catch { /* best-effort */ }
}

/**
 * Delete the Google Calendar event for a removed block.
 */
export async function deleteCalendarEvent(blockId: string): Promise<void> {
  const evId = getEventId(blockId);
  if (!evId) return;

  try {
    await calFetch("DELETE", `${CAL_BASE}/${evId}`);
    removeEventId(blockId);
  } catch { /* best-effort */ }
}
