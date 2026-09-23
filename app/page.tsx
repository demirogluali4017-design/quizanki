import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/fetchAll";
import { buildDailyPackage } from "@/lib/studyEngine";
import { computeStreaks } from "@/lib/dailyActivity";
import { Flashcard } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

async function getDashboardData() {
  const cards = await fetchAllRows<Flashcard>((from, to) =>
    supabase.from("flashcards").select("*").range(from, to)
  );

  const pkg = buildDailyPackage(cards);

  const totalCorrect = cards.reduce((sum, c) => sum + (c.correct_count ?? 0), 0);
  const totalIncorrect = cards.reduce((sum, c) => sum + (c.incorrect_count ?? 0), 0);
  const totalAnswers = totalCorrect + totalIncorrect;
  const successRate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : null;

  const longTermCount = cards.filter((c) => c.repetitions > 0 && c.interval >= 30).length;

  // Streak + günlük hedef
  const today = new Date().toISOString().slice(0, 10);

  const { data: activityRows } = await supabase
    .from("daily_activity")
    .select("activity_date, reviews_done, new_words_done");

  const activeDates = (activityRows ?? [])
    .filter((r) => r.reviews_done > 0)
    .map((r) => r.activity_date as string);
  const streaks = computeStreaks(activeDates);

  const todayRow = (activityRows ?? []).find((r) => r.activity_date === today);
  const todayReviews = todayRow?.reviews_done ?? 0;
  const todayNewWords = todayRow?.new_words_done ?? 0;

  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("daily_new_goal, daily_review_goal")
    .eq("id", 1)
    .maybeSingle();

  const dailyNewGoal = settingsRow?.daily_new_goal ?? 10;
  const dailyReviewGoal = settingsRow?.daily_review_goal ?? 30;

  return {
    total: cards.length,
    pkg,
    successRate,
    longTermCount,
    streaks,
    todayReviews,
    todayNewWords,
    dailyNewGoal,
    dailyReviewGoal,
  };
}

export default async function HomePage() {
  const {
    total,
    pkg,
    successRate,
    longTermCount,
    streaks,
    todayReviews,
    todayNewWords,
    dailyNewGoal,
    dailyReviewGoal,
  } = await getDashboardData();

  const reviewProgress = Math.min(100, Math.round((todayReviews / Math.max(1, dailyReviewGoal)) * 100));
  const newProgress = Math.min(100, Math.round((todayNewWords / Math.max(1, dailyNewGoal)) * 100));
  const todayLabel = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

  const queue = [
    { label: "Gecikmiş", value: pkg.overdueCards.length, tone: "text-red-700" },
    { label: "Zayıf kelime", value: pkg.weakCards.length, tone: "text-orange-700" },
    { label: "Tekrar", value: pkg.dueCards.length, tone: "text-amber-700" },
    { label: "Yeni", value: pkg.newCards.length, tone: "text-indigo-700" },
  ];

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-300">
          {todayLabel}
        </p>
        <div className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h1 className="text-4xl text-slate-900 dark:text-slate-50 sm:text-5xl">Bugünün masası</h1>
            <p className="mt-3 text-base leading-relaxed text-slate-500 dark:text-slate-400">
              Fotoğraftan Fransızca kelime çıkar, SM-2 ile aralıklı tekrarla kalıcı hale getir.
            </p>
          </div>
          <Link
            href="/study"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-indigo-700 px-6 text-sm font-medium text-white transition-colors hover:bg-indigo-800"
          >
            Çalışmaya başla{pkg.totalCount > 0 ? ` · ${pkg.totalCount}` : ""}
          </Link>
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:col-span-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg text-slate-900 dark:text-slate-50">Bugünkü paket</h2>
              <p className="font-display text-2xl tabular-nums text-slate-900 dark:text-slate-50">
                {pkg.totalCount}
              </p>
            </div>
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-700">
              {queue.map((item) => (
                <li key={item.label} className="flex items-center justify-between py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{item.label}</span>
                  <span className={`font-display text-2xl tabular-nums ${item.tone}`}>{item.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4 sm:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Seri</p>
              <p className="mt-2 font-display text-5xl tabular-nums">{streaks.current}</p>
              <p className="mt-2 text-sm text-slate-300">En uzun {streaks.longest} gün</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <GoalBar label="Tekrar" done={todayReviews} goal={dailyReviewGoal} progress={reviewProgress} />
              <div className="mt-4">
                <GoalBar label="Yeni kelime" done={todayNewWords} goal={dailyNewGoal} progress={newProgress} ink />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <MemoryStat label="Kelime" value={String(total)} />
          <MemoryStat label="Başarı" value={successRate !== null ? `%${successRate}` : "—"} />
          <MemoryStat label="Uzun süreli" value={String(longTermCount)} />
        </section>

        <nav className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link
            href="/upload"
            className="flex h-12 items-center justify-center rounded-full border border-slate-300 text-sm font-medium text-slate-800 transition-colors hover:border-slate-900 hover:bg-white dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Kart yükle
          </Link>
          <Link
            href="/words"
            className="flex h-12 items-center justify-center rounded-full border border-slate-300 text-sm font-medium text-slate-800 transition-colors hover:border-slate-900 hover:bg-white dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Tüm kelimeler
          </Link>
          <Link
            href="/progress"
            className="col-span-2 flex h-12 items-center justify-center rounded-full border border-slate-300 text-sm font-medium text-slate-800 transition-colors hover:border-slate-900 hover:bg-white dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 sm:col-span-1"
          >
            İlerleme
          </Link>
        </nav>
      </div>
    </main>
  );
}

function MemoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-slate-100 px-3 py-4 text-center last:border-r-0 dark:border-slate-700">
      <p className="font-display text-2xl tabular-nums text-slate-900 dark:text-slate-50 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function GoalBar({
  label,
  done,
  goal,
  progress,
  ink,
}: {
  label: string;
  done: number;
  goal: number;
  progress: number;
  ink?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="tabular-nums text-slate-400 dark:text-slate-500">
          {done}/{goal}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className={`h-full transition-all ${ink ? "bg-slate-900 dark:bg-slate-100" : "bg-indigo-600"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
