import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchAllFlashcards, STATS_COLUMNS } from "@/lib/loadCards";
import { buildDailyPackage } from "@/lib/studyEngine";
import { computeStreaks } from "@/lib/dailyActivity";
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
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-6 pt-6">
      <div className="home-rise relative overflow-hidden rounded-[2rem] bg-indigo-600 px-6 pb-6 pt-7 text-white">
        <p className="text-sm font-semibold text-indigo-100">Bugün</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-tight">
          Çalışmaya hazırsın.
        </h1>
        <p className="mt-3 text-indigo-100">
          {pkg.totalCount > 0
            ? `${pkg.totalCount} kelime seni bekliyor.`
            : "Bugünkü paket boş. Yeni kelime ekleyebilirsin."}
        </p>
        <Link
          href="/study/learn"
          className="mt-6 flex h-14 items-center justify-center rounded-2xl bg-amber-300 text-base font-semibold text-slate-900"
        >
          Bugünün çalışmasına başla
        </Link>
        <QuoteFlow />
      </div>

      <div className="home-rise mt-5 space-y-4 rounded-3xl bg-white p-4 shadow-sm dark:bg-slate-900" style={{ animationDelay: "80ms" }}>
        <Bar label="Günlük tekrar" done={todayReviews} goal={dailyReviewGoal} progress={reviewProgress} tone="bg-indigo-600" />
        <Bar label="Yeni kelime" done={todayNewWords} goal={dailyNewGoal} progress={newProgress} tone="bg-emerald-500" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Tekrar" value={pkg.dueCards.length} tone="bg-indigo-100 text-indigo-700" delay="120ms" />
        <Stat label="Yeni" value={pkg.newCards.length} tone="bg-emerald-100 text-emerald-800" delay="180ms" />
        <Stat label="Seri" value={streaks.current} hint={`en uzun ${streaks.longest}`} tone="bg-orange-100 text-orange-800" delay="240ms" />
        <Stat label="Hatırlama" value={successRate !== null ? `%${successRate}` : "—"} tone="bg-amber-100 text-amber-900" delay="300ms" />
        <Stat label="Kelime" value={total} tone="bg-violet-100 text-violet-800" delay="360ms" />
        <Stat label="Uzun süreli" value={longTermCount} tone="bg-sky-100 text-sky-800" delay="420ms" />
      </dl>

      {(pkg.overdueCards.length > 0 || pkg.weakCards.length > 0) && (
        <p className="home-rise mt-4 text-sm text-slate-500" style={{ animationDelay: "480ms" }}>
          {pkg.overdueCards.length} gecikmiş, {pkg.weakCards.length} zayıf kelime de bugünkü pakette.
        </p>
      )}
    </main>
  );
}

const POLYGLOT_LINES = [
  { name: "Kató Lomb", text: "Dil, kötü bilinmeye bile değen tek şeydir." },
  { name: "Kató Lomb", text: "Yalnızca diller dünyasında amatör değerlidir." },
  { name: "Kató Lomb", text: "Bilgi, çivi gibi, çakıldıkça yük taşır." },
  { name: "Steve Kaufmann", text: "İlgini izlersen, dil öğrenen biri olarak yavaş yavaş ilerlersin." },
  { name: "Steve Kaufmann", text: "Dil öğrenmek, kendini geliştirmenin en yararlı yollarından biridir." },
  { name: "Steve Kaufmann", text: "Mükemmeli aramadığın sürece öğrenebileceğin dilin sınırı yoktur." },
];

function QuoteFlow() {
  const loop = [...POLYGLOT_LINES, ...POLYGLOT_LINES];
  return (
    <div className="quote-lane mt-6" aria-label="Çokdilli insanların sözleri">
      <div className="quote-track">
        {loop.map((line, index) => (
          <p key={`${line.name}-${index}`} className="quote-item">
            <span className="font-semibold text-white">{line.text}</span>
            <span className="text-indigo-100"> — {line.name}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function Bar({
  label,
  done,
  goal,
  progress,
  tone,
}: {
  label: string;
  done: number;
  goal: number;
  progress: number;
  tone: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {done}/{goal}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`home-bar h-full rounded-full ${tone}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
  delay,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone: string;
  delay: string;
}) {
  return (
    <div className={`home-rise rounded-2xl px-4 py-3 ${tone}`} style={{ animationDelay: delay }}>
      <dt className="text-sm font-medium opacity-80">{label}</dt>
      <dd className="mt-0.5 text-3xl font-semibold tracking-tight">{value}</dd>
      {hint && <p className="text-xs opacity-70">{hint}</p>}
    </div>
  );
}
