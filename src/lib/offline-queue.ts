"use client";
// Simple localStorage queue for mutabaah entries — last-write-wins per PRD §31
const KEY = "mutabaah:queue";

export type QueuedEntry = { habit_id: string; value: number; status: string; date: string; note?: string | null; context?: "SENDIRI" | "BERJAMAAH" | null; ts: number };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidQueued(e: QueuedEntry) {
  return UUID_RE.test(e.habit_id);
}

export function enqueue(entry: Omit<QueuedEntry, "ts">) {
  // Hanya id habit valid (uuid) yang boleh masuk antrean.
  if (!UUID_RE.test(entry.habit_id)) return;
  const q: QueuedEntry[] = JSON.parse(localStorage.getItem(KEY) || "[]");
  const idx = q.findIndex((e) => e.habit_id === entry.habit_id && e.date === entry.date);
  const next = { ...entry, ts: Date.now() } as QueuedEntry;
  if (idx >= 0) q[idx] = next;
  else q.push(next);
  localStorage.setItem(KEY, JSON.stringify(q));
}

export function clearInvalidQueue() {
  try {
    const q: QueuedEntry[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const filtered = q.filter(isValidQueued);
    if (filtered.length !== q.length) localStorage.setItem(KEY, JSON.stringify(filtered));
    if (filtered.length === 0) localStorage.removeItem(KEY);
  } catch {}
}

export function dequeueAll(): QueuedEntry[] {
  const q: QueuedEntry[] = JSON.parse(localStorage.getItem(KEY) || "[]");
  localStorage.removeItem(KEY);
  return q;
}

export async function syncQueue(syncFn: (e: QueuedEntry) => Promise<void>) {
  if (!navigator.onLine) return;
  const q = dequeueAll().filter(isValidQueued);
  for (const e of q) {
    try {
      await syncFn(e);
    } catch {
      enqueue(e);
      break;
    }
  }
}
