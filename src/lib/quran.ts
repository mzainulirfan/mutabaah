// Mushaf Madinah 604 — via alquran.cloud page API (akurat) + myquran fallback
export async function getMadinahPage(page: number): Promise<{ page: number; juz: number; ayahs: { surah: number; surah_name: string; ayah: number; text: string }[] }> {
  // Coba alquran.cloud dulu (Madinah pages akurat)
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`, { cache: "force-cache" });
    if (res.ok) {
      const json = await res.json();
      const ayahs = json.data.ayahs.map((a: any) => ({
        surah: a.surah.number,
        surah_name: a.surah.englishName,
        ayah: a.numberInSurah,
        text: a.text,
        juz: a.juz,
      }));
      const juz = ayahs[0]?.juz ?? 1;
      return { page, juz, ayahs: ayahs.map(({ juz: _j, ...rest }: any) => rest) };
    }
  } catch {}

  // Fallback myquran
  try {
    const res = await fetch(`https://api.myquran.com/v3/quran/${1}`, { cache: "force-cache" });
    // myquran fallback not used for page, try local
  } catch {}

  // Fallback lokal
  const all: any[] = await fetch(`/quran/madinah-604.json?v=3`, { cache: "reload" }).then((r) => r.json());
  const found = all.find((p: any) => p.page === page);
  if (found) return found;
  throw new Error("Page not found");
}
