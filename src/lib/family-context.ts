import type { HabitType } from "@/lib/habits";
import type {
  DbClient,
  DbUser,
  FamilyMemberRow,
  FamilyNameRow,
  HabitListRow,
  MemberLinkRow,
  ProfileRow,
} from "@/lib/supabase/types";

// Cache data keluarga yang jarang berubah (nama, anggota, habit).
// Entri harian TIDAK di-cache — selalu diambil fresh per halaman.
export type FamilyMember = { user_id: string; role: string; name: string; canManageHabits: boolean; canViewFamily: boolean };
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
  canManageHabits: boolean;
  canViewFamily: boolean;
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
export async function getSessionUser(supabase: DbClient): Promise<DbUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export function getFamilyContext(supabase: DbClient, userId: string): Promise<FamilyContext | null> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.ctx);
  const pending = pendingContexts.get(userId);
  if (pending) return pending;
  const request = loadFamilyContext(supabase, userId).finally(() => pendingContexts.delete(userId));
  pendingContexts.set(userId, request);
  return request;
}

async function loadFamilyContext(supabase: DbClient, userId: string): Promise<FamilyContext | null> {

  const { data: memData } = await supabase
    .from("mutabaah_family_members")
    .select("family_id,role,can_manage_habits,can_view_family")
    .eq("user_id", userId)
    .maybeSingle();
  const mem = memData as (MemberLinkRow & { can_manage_habits: boolean | null; can_view_family: boolean | null }) | null;
  if (!mem) return null;

  const [{ data: famData }, { data: famMembersData }, { data: habitRowsData }] = await Promise.all([
    supabase.from("mutabaah_families").select("name").eq("id", mem.family_id).single(),
    supabase.from("mutabaah_family_members").select("user_id,role,can_manage_habits,can_view_family").eq("family_id", mem.family_id),
    supabase
      .from("mutabaah_habits")
      .select("id,name,category,type,target_value,unit,sort_order")
      .eq("family_id", mem.family_id)
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  const fam = famData as FamilyNameRow | null;
  const famMembers = (famMembersData ?? []) as FamilyMemberRow[];
  const habitRows = (habitRowsData ?? []) as HabitListRow[];
  const ids = famMembers.map((m) => m.user_id);
  const { data: profilesData } = ids.length
    ? await supabase.from("mutabaah_profiles").select("id,name").in("id", ids)
    : { data: [] as ProfileRow[] };
  const profiles = (profilesData ?? []) as ProfileRow[];

  const members: FamilyMember[] = famMembers.map((m) => {
    const p = profiles.find((x) => x.id === m.user_id);
    return {
      user_id: m.user_id,
      role: m.role,
      name: p?.name ?? m.user_id.slice(0, 6),
      canManageHabits: m.role === "OWNER" || m.role === "PARENT" || !!m.can_manage_habits,
      canViewFamily: m.role === "OWNER" || m.role === "PARENT" || !!m.can_view_family,
    };
  });
  const habits: FamilyHabit[] = habitRows.map((h, i) => ({
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
    familyName: fam?.name ?? "Keluarga",
    members,
    habits,
    canManageHabits: mem.role === "OWNER" || mem.role === "PARENT" || !!mem.can_manage_habits,
    canViewFamily: mem.role === "OWNER" || mem.role === "PARENT" || !!mem.can_view_family,
  };
  cache.set(userId, { at: Date.now(), ctx });
  return ctx;
}
