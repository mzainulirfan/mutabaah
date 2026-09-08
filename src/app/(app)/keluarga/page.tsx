"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Target, Settings2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getFamilyContext, getSessionUser } from "@/lib/family-context";

export default function KeluargaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState("");
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [activeHabits, setActiveHabits] = useState(0);

  useEffect(() => {
    (async () => {
      if (!supabase) { setLoading(false); return; }
      const user = await getSessionUser(supabase);
      if (!user) { setLoading(false); return; }
      const family = await getFamilyContext(supabase, user.id);
      if (!family) { setLoading(false); return; }
      setFamilyName(family.familyName);
      setMembers(family.members.map((member) => ({ id: member.user_id, name: member.name })));
      setActiveHabits(family.habits.length);
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Memuat keluarga">
        <div className="h-20 rounded-[24px] bg-muted" />
        <div className="h-40 rounded-[20px] bg-muted" />
      </div>
    );
  }

  if (!members.length && !familyName) {
    return (
      <Card className="p-8 text-center rounded-[24px] border-dashed">
        <div className="h-14 w-14 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center mx-auto">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-bold text-lg mt-4">Belum ada keluarga</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-[32ch] mx-auto">Buat keluarga untuk mengatur amalan dan mengundang anggota.</p>
        <Button className="mt-5 rounded-full" onClick={() => (window.location.href = "/onboarding")}>
          Buat Keluarga
        </Button>
      </Card>
    );
  }

  const menu = [
    { href: "/keluarga/anggota", title: "Anggota", desc: "Siapa saja di keluarga ini, undang yang belum bergabung", icon: Users, badge: `${members.length} orang` },
    { href: "/keluarga/amalan", title: "Amalan", desc: "Daftar target harian yang diisi bersama", icon: Target, badge: `${activeHabits} aktif` },
    { href: "/keluarga/lainnya", title: "Lainnya", desc: "Nama keluarga dan tampilan rangkaian", icon: Settings2, badge: "" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] p-6 text-white relative overflow-hidden bg-gradient-to-br from-[#1C5B40] via-[#17452F] to-[#102E21]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/60">Keluarga</p>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight mt-1 text-white">{familyName}</h1>
          <p className="text-sm text-white/70 mt-1">
            {members.length} anggota · {activeHabits} amalan aktif
          </p>
          <div className="mt-4 flex -space-x-2" aria-hidden="true">
            {members.slice(0, 5).map((m) => (
              <div key={m.id} className="h-8 w-8 rounded-full bg-white/15 border-2 border-[#17452F] flex items-center justify-center text-xs font-semibold text-white">
                {m.name.slice(0, 2).toUpperCase()}
              </div>
            ))}
            {members.length > 5 && <div className="h-8 w-8 rounded-full bg-black/25 border-2 border-[#17452F] flex items-center justify-center text-xs font-medium text-white">+{members.length - 5}</div>}
          </div>
        </div>
      </div>

      <Card className="rounded-[20px] p-2">
        <ul className="divide-y divide-border/60">
          {menu.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="h-10 w-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-primary shrink-0">
                  <m.icon className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-sm leading-none">{m.title}</span>
                  <span className="block text-xs text-muted-foreground mt-1.5 truncate">{m.desc}</span>
                </span>
                {m.badge ? (
                  <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium shrink-0 tabular-nums">{m.badge}</span>
                ) : null}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-center text-xs text-muted-foreground leading-5">
        Perubahan di sini langsung berlaku untuk semua anggota,<br />jadi ubahlah dengan tenang dan secukupnya.
      </p>
    </div>
  );
}
