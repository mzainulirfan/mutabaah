import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { redirect } from "next/navigation";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const token_hash = createHash("sha256").update(token).digest("hex");
  const { data: invitation } = await supabase.from("mutabaah_invitations").select("id,family_id,expires_at,used_at,created_at").eq("token_hash", token_hash).maybeSingle();

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--primary-soft)]/30">
        <Card className="w-full max-w-[480px] p-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-amber-600" />
          <h1 className="font-bold text-lg mt-3">Undangan tidak valid</h1>
          <p className="text-sm text-muted-foreground mt-2">Token tidak ditemukan. Minta orang tua buat undangan baru — atau gabung dengan kode 6 huruf.</p>
          <Link href="/gabung" className="block mt-6">
            <Button className="w-full">Gabung dengan kode</Button>
          </Link>
          <Link href="/login" className="block mt-2">
            <Button variant="secondary" className="w-full">
              Ke Login
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--primary-soft)]/30">
        <Card className="w-full max-w-[480px] p-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
          <h1 className="font-bold text-lg mt-3">Undangan sudah tidak berlaku.</h1>
          <p className="text-sm text-muted-foreground mt-2">Undangan kadaluwarsa 7 hari. Minta parent buat undangan baru.</p>
          <Link href="/login" className="block mt-6">
            <Button className="w-full">Minta Undangan Baru</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { data: family } = await supabase.from("mutabaah_families").select("name").eq("id", invitation.family_id).maybeSingle();
  const { data: userData } = await supabase.auth.getUser();

  // not logged in → show CTA to login then come back
  if (!userData.user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--primary-soft)]/30">
        <Card className="w-full max-w-[480px] p-8 text-center">
          <Users className="h-10 w-10 mx-auto text-primary" />
          <h1 className="font-bold text-lg mt-3">Bergabung ke {family?.name ?? "Keluarga"}</h1>
          <p className="text-sm text-muted-foreground mt-2">Login dulu untuk konfirmasi bergabung. Undangan berlaku sampai {new Date(invitation.expires_at ?? "").toLocaleDateString("id-ID")}.</p>
          <Link href={`/login?next=/join/${token}`} className="block mt-6">
            <Button className="w-full">Login / Daftar untuk Join</Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-3">Setelah login kamu akan kembali ke halaman ini untuk konfirmasi.</p>
        </Card>
      </div>
    );
  }

  // check already member
  const { data: existing } = await supabase.from("mutabaah_family_members").select("role").eq("family_id", invitation.family_id).eq("user_id", userData.user.id).maybeSingle();
  if (existing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--primary-soft)]/30">
        <Card className="w-full max-w-[480px] p-8 text-center">
          <Check className="h-10 w-10 mx-auto text-emerald-600" />
          <h1 className="font-bold text-lg mt-3">Kamu sudah anggota {family?.name}</h1>
          <p className="text-sm text-muted-foreground mt-2">Role: {existing.role}</p>
          <Link href="/beranda" className="block mt-6">
            <Button className="w-full">Ke Beranda</Button>
          </Link>
        </Card>
      </div>
    );
  }

  async function handleJoin() {
    "use server";
    const supabase = await createClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) redirect(`/login?next=/join/${token}`);
    const { acceptInvitation } = await import("@/lib/actions/family");
    await acceptInvitation(token);
    redirect("/beranda");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--primary-soft)]/30">
      <Card className="w-full max-w-[480px] p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto font-bold">م</div>
        <h1 className="font-bold text-lg mt-3">Konfirmasi bergabung</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kamu diundang ke <span className="font-semibold text-foreground">{family?.name ?? "Keluarga"}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-2">Sebagai MEMBER — kamu bisa lihat target & isi mutabaah sendiri. Data keluarga privat (RLS).</p>
        <form action={handleJoin} className="mt-6">
          <Button type="submit" className="w-full" size="lg">
            Konfirmasi & Join Keluarga
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-3">Dengan join kamu setuju data mutabaah tersimpan privat keluarga.</p>
        <div className="mt-4 text-xs text-muted-foreground">Login sebagai {userData.user.email}</div>
      </Card>
    </div>
  );
}
