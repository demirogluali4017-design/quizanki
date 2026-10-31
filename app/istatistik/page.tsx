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

  const today = new Date();
  const last30: { date: string; reviews: number; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = rows.find((r) => r.activity_date === key);
    last30.push({
      date: key,
      reviews: row?.reviews_done ?? 0,
      label: d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    });
  }

  const maxReviews = Math.max(8, ...last30.map((d) => d.reviews));
  const avg = Math.round(last30.reduce((s, d) => s + d.reviews, 0) / 30);

  const totalCorrect = cards.reduce((s, c) => s + (c.correct_count ?? 0), 0);
  const totalIncorrect = cards.reduce((s, c) => s + (c.incorrect_count ?? 0), 0);
  const success =
    totalCorrect + totalIncorrect > 0
      ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100)
      : 0;

  const withData = cards
    .map((c) => {
      const correct = c.correct_count ?? 0;
      const incorrect = c.incorrect_count ?? 0;
      const total = correct + incorrect;
      return { card: c, rate: total >= 3 ? correct / total : null };
    })
    .filter((x) => x.rate !== null);

  const best = [...withData].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];
  const worst = [...withData].sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0))[0];

  return { last30, maxReviews, avg, streaks, success, best, worst };
}

export default async function IstatistikPage() {
  const { last30, maxReviews, avg, streaks, success, best, worst } = await getStats();

  const points = last30
    .map((d, i) => {
      const x = 16 + (i / 29) * 288;
      const y = 148 - (d.reviews / maxReviews) * 110;
      return `${x},${y}`;
    })
    .join(" ");

  const last = last30[last30.length - 1];
  const lastX = 16 + (29 / 29) * 288;
  const lastY = 148 - (last.reviews / maxReviews) * 110;

  return (
    <main className="min-h-screen bg-[#0c1f17] text-[#f1f8f4]">
      <div className="mx-auto max-w-[420px] px-5 pb-16 pt-6">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <Link href="/fr" className="text-sm text-[#7dcea0] hover:text-white transition">
            ← Geri
          </Link>
          <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#5d8a72]">
            Quizanki
          </span>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="font-serif text-[42px] leading-[1.05] tracking-tight">
            30 gün
            <br />
            tekrar.
          </h1>
          <p className="mt-3 text-sm text-[#8fbc9a]">
            Günlük tekrar sayısı · kesik çizgi ortalama ({avg})
          </p>
        </div>

        {/* Chart Card */}
        <div className="relative mb-10 rounded-3xl bg-[#13291f] p-5 pt-6">
          <div className="absolute right-6 top-5 text-right">
            <p className="font-serif text-4xl leading-none">{success}</p>
            <p className="mt-1 text-[11px] text-[#8fbc9a]">başarı %</p>
          </div>

          <svg viewBox="0 0 320 160" className="w-full" style={{ height: 180 }}>
            {/* grid */}
            <line x1="16" y1="40" x2="304" y2="40" stroke="#1e3d2e" strokeWidth="1" />
            <line x1="16" y1="90" x2="304" y2="90" stroke="#1e3d2e" strokeWidth="1" />
            <line x1="16" y1="140" x2="304" y2="140" stroke="#1e3d2e" strokeWidth="1" />

            {/* average */}
            <line
              x1="16"
              y1={148 - (avg / maxReviews) * 110}
              x2="304"
              y2={148 - (avg / maxReviews) * 110}
              stroke="#4ade80"
              strokeDasharray="3 4"
              strokeWidth="1.2"
              opacity="0.6"
            />

            {/* area */}
            <polyline
              fill="url(#grad)"
              stroke="none"
              points={`16,148 ${points} 304,148`}
            />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* line */}
            <polyline
              fill="none"
              stroke="#e8f5e9"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points}
            />

            {/* last point */}
            <circle cx={lastX} cy={lastY} r="5" fill="#0c1f17" stroke="#e8f5e9" strokeWidth="2.5" />
          </svg>

          <div className="mt-1 flex justify-between px-1 text-[11px] text-[#6a9a7e]">
            <span>{last30[0].label}</span>
            <span>bugün</span>
          </div>
        </div>

        {/* Streak */}
        <div className="mb-3 flex items-end justify-between">
          <p className="text-sm font-medium">Seri</p>
          <p className="text-sm text-[#8fbc9a]">
            {streaks.current} gün <span className="text-[#5d8a72]">· en uzun {streaks.longest}</span>
          </p>
        </div>
        <div className="mb-10 flex flex-wrap gap-[7px]">
          {last30.map((d, i) => {
            const active = d.reviews > 0;
            const isToday = i === 29;
            return (
              <div
                key={d.date}
                className={`h-3.5 w-3.5 rounded-full transition ${
                  active
                    ? "bg-[#e8f5e9]"
                    : "bg-transparent border border-[#2a4a38]"
                } ${isToday ? "ring-2 ring-[#f87171] ring-offset-2 ring-offset-[#0c1f17]" : ""}`}
                title={`${d.label}: ${d.reviews}`}
              />
            );
          })}
        </div>

        {/* Bottom cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#1e3d2e] bg-[#13291f] p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#7dcea0]">En iyi</p>
            <p className="mt-2 truncate font-medium">{best?.card.word ?? "—"}</p>
            <p className="mt-1 font-serif text-3xl leading-none">
              {best ? Math.round((best.rate ?? 0) * 100) : "—"}
              <span className="text-lg">%</span>
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e3d2e] bg-[#13291f] p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#7dcea0]">Zorlanan</p>
            <p className="mt-2 truncate font-medium">{worst?.card.word ?? "—"}</p>
            <p className="mt-1 font-serif text-3xl leading-none">
              {worst ? Math.round((worst.rate ?? 0) * 100) : "—"}
              <span className="text-lg">%</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
