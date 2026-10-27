import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchAllFlashcards } from "@/lib/loadCards";
import { computeStreaks } from "@/lib/dailyActivity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getStats() {
  const supabase = await createSupabaseServerClient();
  const cards = await fetchAllFlashcards(supabase);

  const { data: activity } = await supabase
    .from("daily_activity")
    .select("activity_date, reviews_done, new_words_done")
    .order("activity_date", { ascending: true });

  const rows = activity ?? [];
  const activeDates = rows.filter((r) => r.reviews_done > 0).map((r) => r.activity_date as string);
  const streaks = computeStreaks(activeDates);

  // Son 30 gün
  const today = new Date();
  const last30: { date: string; reviews: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = rows.find((r) => r.activity_date === key);
    last30.push({ date: key, reviews: row?.reviews_done ?? 0 });
  }

  const maxReviews = Math.max(1, ...last30.map((d) => d.reviews));

  const totalCorrect = cards.reduce((s, c) => s + (c.correct_count ?? 0), 0);
  const totalIncorrect = cards.reduce((s, c) => s + (c.incorrect_count ?? 0), 0);
  const success = totalCorrect + totalIncorrect > 0
    ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100)
    : 0;

  const withData = cards
    .map((c) => {
      const correct = c.correct_count ?? 0;
      const incorrect = c.incorrect_count ?? 0;
      const total = correct + incorrect;
      return { card: c, rate: total >= 3 ? correct / total : null, total };
    })
    .filter((x) => x.rate !== null);

  const mostImproved = [...withData].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)).slice(0, 1)[0];
  const stillStubborn = [...withData].sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0)).slice(0, 1)[0];

  return { last30, maxReviews, streaks, success, mostImproved, stillStubborn, totalReviews: rows.reduce((s, r) => s + r.reviews_done, 0) };
}

export default async function IstatistikPage() {
  const { last30, maxReviews, streaks, success, mostImproved, stillStubborn, totalReviews } = await getStats();

  // Streak dots (son 30 gün)
  const streakDots = last30.map((d) => d.reviews > 0);

  return (
    <main className="min-h-screen bg-[#0f2419] text-[#e8f5e9] px-5 py-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm text-[#a5d6a7] hover:underline">← Geri</Link>
          <p className="text-xs tracking-widest uppercase text-[#a5d6a7]">quizanki</p>
        </div>

        <h1 className="font-serif text-4xl leading-tight mb-1">30 gün tekrar.</h1>
        <p className="text-sm text-[#81c784] mb-8">günlük tekrar sayısı · kesik çizgi = ortalama</p>

        {/* Grafik */}
        <div className="relative h-40 mb-2">
          <svg viewBox="0 0 300 120" className="w-full h-full" preserveAspectRatio="none">
            {/* Ortalama çizgi */}
            <line x1="0" y1="60" x2="300" y2="60" stroke="#4caf50" strokeDasharray="4 4" strokeWidth="1" opacity="0.5" />
            {/* Çizgi */}
            <polyline
              fill="none"
              stroke="#e8f5e9"
              strokeWidth="2"
              points={last30
                .map((d, i) => {
                  const x = (i / 29) * 300;
                  const y = 110 - (d.reviews / maxReviews) * 90;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {/* Son nokta */}
            {last30.length > 0 && (
              <circle
                cx={(29 / 29) * 300}
                cy={110 - (last30[29].reviews / maxReviews) * 90}
                r="4"
                fill="#e8f5e9"
              />
            )}
          </svg>
          <div className="absolute top-2 right-2 text-2xl font-serif">{success}</div>
        </div>
        <div className="flex justify-between text-xs text-[#81c784] mb-8">
          <span>30 gün önce</span>
          <span>bugün</span>
        </div>

        {/* Streak */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm">seri</p>
          <p className="text-sm text-[#a5d6a7]">{streaks.current} gün · en uzun {streaks.longest}</p>
        </div>
        <div className="grid grid-cols-15 gap-1.5 mb-8">
          {streakDots.map((active, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${active ? "bg-[#e8f5e9]" : "bg-[#1b3a2a] border border-[#2e5a3e]"} ${
                i === 29 ? "ring-2 ring-[#ef5350]" : ""
              }`}
            />
          ))}
        </div>

        {/* Alt kartlar */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#2e5a3e] p-4">
            <p className="text-xs text-[#81c784] mb-1">en çok gelişen</p>
            <p className="font-medium">{mostImproved?.card.word ?? "—"}</p>
            <p className="text-2xl font-serif mt-1">
              {mostImproved ? `%${Math.round((mostImproved.rate ?? 0) * 100)}` : "—"}
            </p>
            <p className="text-xs text-[#81c784] mt-1">başarı oranı</p>
          </div>
          <div className="rounded-2xl border border-[#2e5a3e] p-4">
            <p className="text-xs text-[#81c784] mb-1">hâlâ zor</p>
            <p className="font-medium">{stillStubborn?.card.word ?? "—"}</p>
            <p className="text-2xl font-serif mt-1">
              {stillStubborn ? `%${Math.round((stillStubborn.rate ?? 0) * 100)}` : "—"}
            </p>
            <p className="text-xs text-[#81c784] mt-1">başarı oranı</p>
          </div>
        </div>

        <p className="text-center text-xs text-[#4caf50] mt-10">toplam {totalReviews} tekrar</p>
      </div>
    </main>
  );
}
