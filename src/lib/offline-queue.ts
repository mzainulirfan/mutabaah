"use client";
// Simple localStorage queue for mutabaah entries — last-write-wins per PRD §31
const KEY = "mutabaah:queue";

export type QueuedEntry = { habit_id: string; value: number; status: string; date: string; note?: string; ts: number };

export function enqueue(entry: Omit<QueuedEntry, "ts">) {
  const q: QueuedEntry[] = JSON.parse(localStorage.getItem(KEY) || "[]");
  const idx = q.findIndex((e) => e.habit_id === entry.habit_id && e.date === entry.date);
  const next = { ...entry, ts: Date.now() } as QueuedEntry;
  if (idx >= 0) q[idx] = next;
  else q.push(next);
  localStorage.setItem(KEY, JSON.stringify(q));
}

export function dequeueAll(): QueuedEntry[] {
  const q: QueuedEntry[] = JSON.parse(localStorage.getItem(KEY) || "[]");
  localStorage.removeItem(KEY);
  return q;
}

export async function syncQueue(syncFn: (e: QueuedEntry) => Promise<void>) {
  if (!navigator.onLine) return;
  const q = dequeueAll();
  for (const e of q) {
    try {
      await syncFn(e);
    } catch {
      enqueue(e);
      break;
    }
  }
}
