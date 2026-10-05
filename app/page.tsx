import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchAllFlashcards, STATS_COLUMNS } from "@/lib/loadCards";
import { buildDailyPackage } from "@/lib/studyEngine";
import { computeStreaks } from "@/lib/dailyActivity";
import MotiveLine from "@/components/MotiveLine";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

async function getDashboardData() {
  const supabase = await createSupabaseServerClient();
  const cards = await fetchAllFlashcards(supabase, STATS_COLUMNS);

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-4 pt-8">
      <p className="text-sm font-semibold text-indigo-600">Bugün</p>
      <h1 className="mt-1 text-[2rem] font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
        Bugün çalışmaya hazırsın.
      </h1>
      <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
        {pkg.totalCount > 0
          ? `${pkg.totalCount} kelime seni bekliyor.`
          : "Bugünkü paket boş. Yeni kelime ekleyebilirsin."}
      </p>

      <Link
        href="/study/learn"
        className="mt-6 flex h-14 items-center justify-center rounded-2xl bg-indigo-600 text-base font-semibold text-white"
      >
        Bugünün çalışmasına başla
      </Link>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-500">Günlük tekrar</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {todayReviews}/{dailyReviewGoal}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full bg-indigo-600" style={{ width: `${reviewProgress}%` }} />
        </div>
        <div className="mb-2 mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">Yeni kelime</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {todayNewWords}/{dailyNewGoal}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full bg-emerald-500" style={{ width: `${newProgress}%` }} />
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
        <Stat label="Tekrar" value={pkg.dueCards.length} />
        <Stat label="Yeni" value={pkg.newCards.length} />
        <Stat label="Seri" value={`${streaks.current}`} hint={`en uzun ${streaks.longest}`} />
        <Stat label="Hatırlama" value={successRate !== null ? `%${successRate}` : "—"} />
        <Stat label="Kelime" value={total} />
        <Stat label="Uzun süreli" value={longTermCount} />
      </dl>

      {(pkg.overdueCards.length > 0 || pkg.weakCards.length > 0) && (
        <p className="mt-6 text-sm text-slate-500">
          {pkg.overdueCards.length} gecikmiş, {pkg.weakCards.length} zayıf kelime de bugünkü pakette.
        </p>
      )}

      <div className="mt-8">
        <MotiveLine />
      </div>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{value}</dd>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
