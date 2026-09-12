// send-reminders — Edge Function (Deno). Dijadwalkan tiap 5 menit via pg_cron.
// Mengirim Web Push yang JATUH TEMPO dalam jendela [now-6m, now], waktu Jakarta.
//
// Secrets yang dibutuhkan (Dashboard → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...),
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.115.0";
import webpush from "npm:web-push@3.6.7";

const TOLERANCE_MIN = 6;

type PrefRow = {
  user_id: string;
  enabled: boolean;
  morning_time: string | null;
  evening_time: string | null;
};

function jakartaNow(): { date: string; hm: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hm = `${get("hour")}:${get("minute")}`;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hm,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function inWindow(scheduled: string | null, nowMin: number): boolean {
  if (!scheduled) return false;
  const [hh, mm] = scheduled.slice(0, 5).split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  const diff = nowMin - (hh * 60 + mm);
  return diff >= 0 && diff < TOLERANCE_MIN;
}

serve(async (req: Request) => {
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const auth = req.headers.get("Authorization") ?? "";
    if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:mutabaah@example.com";
    if (!vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ error: "VAPID belum dikonfigurasi" }), { status: 500 });
    }
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
    const now = jakartaNow();

    // 1) Preferensi global yang jatuh tempo.
    const { data: prefs } = await supabase.from("mutabaah_notification_preferences").select("user_id,enabled,morning_time,evening_time").eq("enabled", true);
    // 2) Amalan ber-jam yang jatuh tempo (aktif saja).
    const { data: habits } = await supabase
      .from("mutabaah_habits")
      .select("id,family_id,name,target_value,unit,reminder_time")
      .eq("is_active", true)
      .not("reminder_time", "is", null);

    type Due =
      | { kind: "morning" | "evening"; userId: string }
      | { kind: "habit"; userId: string; familyId: string; habitId: string; name: string; target: number; unit: string | null };
    const due: Due[] = [];
    const memberOf = new Map<string, string>();

    for (const p of (prefs ?? []) as PrefRow[]) {
      if (inWindow(p.morning_time, now.minutes)) due.push({ kind: "morning", userId: p.user_id });
      if (inWindow(p.evening_time, now.minutes)) due.push({ kind: "evening", userId: p.user_id });
    }
    for (const h of (habits ?? []) as { id: string; family_id: string; name: string; target_value: number; unit: string | null; reminder_time: string }[]) {
      if (!inWindow(h.reminder_time, now.minutes)) continue;
      const { data: mems } = await supabase.from("mutabaah_family_members").select("user_id").eq("family_id", h.family_id);
      for (const m of (mems ?? []) as { user_id: string }[]) {
        memberOf.set(m.user_id, h.family_id);
        due.push({ kind: "habit", userId: m.user_id, familyId: h.family_id, habitId: h.id, name: h.name, target: Number(h.target_value) || 1, unit: h.unit });
      }
    }
    if (due.length === 0) return Response.json({ sent: 0, skipped: 0 });

    // Keluarga tiap user (untuk slot global).
    const needFam = [...new Set(due.filter((d) => d.kind !== "habit").map((d) => d.userId))];
    for (const uid of needFam) {
      if (memberOf.has(uid)) continue;
      const { data: mem } = await supabase.from("mutabaah_family_members").select("family_id").eq("user_id", uid).limit(1).maybeSingle();
      if (mem) memberOf.set(uid, (mem as { family_id: string }).family_id);
    }

    let sent = 0;
    let skipped = 0;
    for (const d of due) {
      try {
        const familyId = d.kind === "habit" ? d.familyId : memberOf.get(d.userId);
        if (!familyId) { skipped++; continue; }
        // Relevansi: lewati bila sudah terisi.
        const q = supabase.from("mutabaah_entries").select("value,status,habit_id").eq("family_id", familyId).eq("user_id", d.userId).eq("date", now.date);
        const { data: entries } = d.kind === "habit" ? await q.eq("habit_id", d.habitId) : await q;
        const rows = (entries ?? []) as { value: number; status: string }[];
        if (d.kind === "morning" && rows.length > 0) { skipped++; continue; }
        if (d.kind === "habit") {
          const v = rows.length > 0 ? Number(rows[0].value) : 0;
          if (rows[0]?.status === "COMPLETED" || v >= d.target) { skipped++; continue; }
        }
        if (d.kind === "evening") {
          const { count: total } = await supabase.from("mutabaah_habits").select("id", { count: "exact", head: true }).eq("family_id", familyId).eq("is_active", true);
          const done = rows.filter((r) => r.status === "COMPLETED").length;
          if ((total ?? 0) > 0 && done >= (total ?? 0)) { skipped++; continue; }
        }

        const { data: subs } = await supabase.from("mutabaah_push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", d.userId);
        const list = (subs ?? []) as { endpoint: string; p256dh: string; auth: string }[];
        if (list.length === 0) { skipped++; continue; }

        let payload: { title: string; body: string; tag: string };
        if (d.kind === "morning") {
          payload = { title: "Mutabaah", body: "Jangan lupa mutabaah pagi — cukup 30 detik.", tag: "mutabaah-morning" };
        } else if (d.kind === "evening") {
          payload = { title: "Mutabaah", body: "Sudah mengisi mutabaah hari ini?", tag: "mutabaah-evening" };
        } else {
          const unit = d.unit ? ` ${d.unit}` : "";
          const row = rows[0];
          const v = row ? Number(row.value) : 0;
          payload = {
            title: d.name,
            body: v > 0 ? `Belum selesai — ${v}/${d.target}${unit} terisi. Lanjutkan?` : `Belum diisi hari ini — target ${d.target}${unit}. Mulai sekarang?`,
            tag: `mutabaah-habit-${d.habitId}`,
          };
        }

        for (const s of list) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ ...payload, data: { url: "/mutabaah" } })
            );
            sent++;
          } catch (e) {
            const status = (e as { statusCode?: number })?.statusCode;
            if (status === 404 || status === 410) {
              await supabase.from("mutabaah_push_subscriptions").delete().eq("user_id", d.userId).eq("endpoint", s.endpoint);
            }
            skipped++;
          }
        }
      } catch {
        skipped++;
      }
    }

    return Response.json({ sent, skipped, at: now.date + " " + now.hm });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "gagal" }), { status: 500 });
  }
});
