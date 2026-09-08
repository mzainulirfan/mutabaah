import type { HabitType } from "@/lib/mock-data";

// Cache data keluarga yang jarang berubah (nama, anggota, habit).
// Entri harian TIDAK di-cache — selalu diambil fresh per halaman.
export type FamilyMember = { user_id: string; role: string; name: string };
export type FamilyHabit = {
  id: string;
  name: string;
  category: string;
  type: HabitType;
  target_value: number;
  unit: string | null;
  sort_order: number;
};
export type FamilyContext = {
  familyId: string;
  role: string;
  familyName: string;
  members: FamilyMember[];
  habits: FamilyHabit[];
};

const cache = new Map<string, { at: number; ctx: FamilyContext }>();
const pendingContexts = new Map<string, Promise<FamilyContext | null>>();
const TTL = 90_000;

export function clearFamilyCache() {
  cache.clear();
  pendingContexts.clear();
}

// Navigasi klien tidak perlu memvalidasi token ke jaringan berulang kali.
// Semua query data tetap dilindungi oleh RLS dan server action tetap memakai getUser().
export async function getSessionUser(supabase: any) {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export function getFamilyContext(supabase: any, userId: string): Promise<FamilyContext | null> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.ctx);
  const pending = pendingContexts.get(userId);
  if (pending) return pending;
  const request = loadFamilyContext(supabase, userId).finally(() => pendingContexts.delete(userId));
  pendingContexts.set(userId, request);
  return request;
}

async function loadFamilyContext(supabase: any, userId: string): Promise<FamilyContext | null> {

  const { data: mem } = await supabase
    .from("mutabaah_family_members")
    .select("family_id,role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!mem) return null;

  const [{ data: fam }, { data: famMembers }, { data: habitRows }] = await Promise.all([
    supabase.from("mutabaah_families").select("name").eq("id", mem.family_id).single(),
    supabase.from("mutabaah_family_members").select("user_id,role").eq("family_id", mem.family_id),
    supabase
      .from("mutabaah_habits")
      .select("id,name,category,type,target_value,unit,sort_order")
      .eq("family_id", mem.family_id)
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  const ids = (famMembers ?? []).map((m: any) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("mutabaah_profiles").select("id,name").in("id", ids)
    : { data: [] as any[] };

  const members: FamilyMember[] = (famMembers ?? []).map((m: any) => {
    const p = (profiles ?? []).find((x: any) => x.id === m.user_id);
    return { user_id: m.user_id, role: m.role, name: (p?.name as string) ?? m.user_id.slice(0, 6) };
  });
  const habits: FamilyHabit[] = (habitRows ?? []).map((h: any, i: number) => ({
    id: h.id,
    name: h.name,
    category: h.category,
    type: h.type as HabitType,
    target_value: Number(h.target_value),
    unit: h.unit ?? null,
    sort_order: h.sort_order ?? i,
  }));

  const ctx: FamilyContext = {
    familyId: mem.family_id,
    role: mem.role,
    familyName: (fam as any)?.name ?? "Keluarga",
    members,
    habits,
  };
  cache.set(userId, { at: Date.now(), ctx });
  return ctx;
}
