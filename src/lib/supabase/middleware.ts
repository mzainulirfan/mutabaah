import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/daftar", "/gabung", "/onboarding", "/auth/callback", "/manifest.json", "/sw.js", "/join"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  // "/" hanya cocok persis — startsWith("/") akan menandai SEMUA path sebagai publik.
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth");
  const isProtected = ["/beranda", "/mutabaah", "/progress", "/keluarga", "/profil"].some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Bukan rute proteksi: keluar SEBELUM membuat client Supabase (hemat parse cookie).
  if (!isProtected) return supabaseResponse;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Tanpa env tidak ada sesi yang bisa divalidasi — lewatkan (miskonfigurasi
  // akan gagal cepat di halaman lewat createClient yang melempar error).
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  // Protected routes: cukup baca sesi dari cookie (tanpa network).
  // Validasi penuh tetap dilakukan per halaman via auth.getUser() + RLS.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
