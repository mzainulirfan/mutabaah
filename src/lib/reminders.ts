"use client";
import type { DbClient } from "@/lib/supabase/types";
import { getFamilyContext } from "@/lib/family-context";
import { localDateKey } from "@/lib/local-date";

export type ReminderPrefs = { enabled: boolean; morning: string; evening: string };

// Timer hidup di tab ini. Keterbatasan jujur: pengingat lokal hanya jalan
// bila aplikasi minimal pernah dibuka (tidak ada server yang membangunkan).
// Tag yang sama membuat notifikasi menimpa, bukan menumpuk antar-tab.
const timers: ReturnType<typeof setTimeout>[] = [];

export function isReminderSupported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function reminderPermission(): NotificationPermission | "unsupported" {
  if (!isReminderSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestReminderPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isReminderSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function clearScheduledReminders() {
  while (timers.length) clearTimeout(timers.pop());
}

/** Baca preferensi lalu jadwalkan ulang. Dipanggil saat aplikasi dibuka & setelah simpan pengaturan. */
export async function refreshReminders(supabase: DbClient): Promise<void> {
  try {
    clearScheduledReminders();
    if (!isReminderSupported() || Notification.permission !== "granted") return;
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    const family = await getFamilyContext(supabase, user.id);
    if (!family) return;
    const { data: pref } = await supabase
      .from("mutabaah_notification_preferences")
      .select("enabled,morning_time,evening_time")
      .eq("user_id", user.id)
      .maybeSingle();
    const prefs = pref as { enabled: boolean; morning_time: string | null; evening_time: string | null } | null;
    if (!prefs?.enabled) return;
    const total = family.habits.length;
    if (total === 0) return;
    queueReminder(supabase, user.id, family.familyId, total, "morning", prefs.morning_time?.slice(0, 5) ?? "07:00");
    queueReminder(supabase, user.id, family.familyId, total, "evening", prefs.evening_time?.slice(0, 5) ?? "20:30");
  } catch {}
}

function nextFire(time: string): Date {
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hh || 0, mm || 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

function queueReminder(
  supabase: DbClient,
  userId: string,
  familyId: string,
  totalHabits: number,
  kind: "morning" | "evening",
  time: string
) {
  const delay = nextFire(time).getTime() - Date.now();
  timers.push(
    setTimeout(() => {
      void fireReminder(supabase, userId, familyId, totalHabits, kind).finally(() => {
        // Jadwalkan lagi untuk besok.
        queueReminder(supabase, userId, familyId, totalHabits, kind, time);
      });
    }, delay)
  );
}

async function fireReminder(
  supabase: DbClient,
  userId: string,
  familyId: string,
  totalHabits: number,
  kind: "morning" | "evening"
): Promise<void> {
  try {
    if (!isReminderSupported() || Notification.permission !== "granted") return;
    const today = localDateKey(new Date());
    const { data } = await supabase
      .from("mutabaah_entries")
      .select("status")
      .eq("family_id", familyId)
      .eq("user_id", userId)
      .eq("date", today);
    const rows = ((data ?? []) as { status: string }[]);
    // Hanya kirim bila masih relevan: pagi = belum ada isian sama sekali,
    // malam = belum semua selesai.
    if (kind === "morning" && rows.length > 0) return;
    const done = rows.filter((r) => r.status === "COMPLETED").length;
    if (kind === "evening" && done >= totalHabits) return;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Mutabaah", {
      body: kind === "morning" ? "Jangan lupa mutabaah pagi — cukup 30 detik." : "Sudah mengisi mutabaah hari ini?",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: `mutabaah-${kind}`,
      data: { url: "/mutabaah" },
    });
  } catch {}
}
