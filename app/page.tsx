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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const allowed = Boolean(user) && (!owner || user?.email?.toLowerCase() === owner);
  if (!allowed) return <ProductDoor />;
  return <Dashboard />;
}

async function Dashboard() {
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
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-6 pt-8">
      <div className="home-rise">
        <p className="text-sm font-medium tracking-wide text-indigo-600 uppercase">Quizanki</p>
        <h1 className="mt-2 font-display text-4xl font-medium leading-tight tracking-tight text-slate-900">
          Bugün
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          {pkg.totalCount > 0
            ? `${pkg.totalCount} kelime seni bekliyor.`
            : "Bugünkü paket boş. Yeni kelime ekleyebilirsin."}
        </p>
        <Link
          href="/study/learn"
          className="mt-6 flex h-14 items-center justify-center rounded-xl bg-indigo-600 text-base font-semibold text-white"
        >
          Çalış
        </Link>
        <Link
          href="/read"
          className="mt-3 flex h-12 items-center justify-center rounded-xl border border-slate-300 text-sm font-medium text-slate-700"
        >
          Okumalar
        </Link>
      </div>

      <div className="home-rise mt-8 space-y-4 rounded-2xl bg-white p-5 shadow-sm" style={{ animationDelay: "80ms" }}>
        <Bar label="Günlük tekrar" done={todayReviews} goal={dailyReviewGoal} progress={reviewProgress} tone="bg-indigo-600" />
        <Bar label="Yeni kelime" done={todayNewWords} goal={dailyNewGoal} progress={newProgress} tone="bg-indigo-400" />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <Stat label="Tekrar" value={pkg.dueCards.length} tone="bg-indigo-50 text-indigo-800" delay="120ms" />
        <Stat label="Yeni" value={pkg.newCards.length} tone="bg-slate-100 text-slate-800" delay="180ms" />
        <Stat label="Seri" value={streaks.current} hint={`en uzun ${streaks.longest}`} tone="bg-indigo-50 text-indigo-800" delay="240ms" />
        <Stat label="Hatırlama" value={successRate !== null ? `%${successRate}` : "—"} tone="bg-slate-100 text-slate-800" delay="300ms" />
        <Stat label="Kelime" value={total} tone="bg-indigo-50 text-indigo-800" delay="360ms" />
        <Stat label="Uzun süreli" value={longTermCount} tone="bg-slate-100 text-slate-800" delay="420ms" />
      </dl>

      {(pkg.overdueCards.length > 0 || pkg.weakCards.length > 0) && (
        <p className="home-rise mt-4 text-sm text-slate-500" style={{ animationDelay: "480ms" }}>
          {pkg.overdueCards.length} gecikmiş, {pkg.weakCards.length} zayıf kelime de bugünkü pakette.
        </p>
      )}
    </main>
  );
}

function ProductDoor() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-12">
      <p className="text-sm font-medium tracking-wide text-indigo-600 uppercase">Quizanki</p>
      <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight text-slate-900">
        Fransızca kelimeleri gerçekten hatırla.
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">
        Gazetedeki bilmediğin kelime bugünün kartı olur. Unuttuğun kelime yarın geri gelir.
      </p>
      <ul className="mt-6 space-y-2 text-sm text-slate-600">
        <li>Fotoğraftan kelime alırsın.</li>
        <li>Her gün yalnız o günkü paketi çalışırsın.</li>
        <li>Unuttum, zorlandım, hatırladım ya da çok kolaydı dersin.</li>
      </ul>
      <Link
        href="/login"
        className="mt-8 flex h-14 items-center justify-center rounded-xl bg-indigo-600 text-base font-semibold text-white"
      >
        Giriş yap
      </Link>
    </main>
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
        <span className="font-medium text-slate-800">
          {done}/{goal}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
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
    <div className={`home-rise rounded-xl px-4 py-3 ${tone}`} style={{ animationDelay: delay }}>
      <dt className="text-sm font-medium opacity-70">{label}</dt>
      <dd className="mt-0.5 font-display text-3xl font-medium tracking-tight">{value}</dd>
      {hint && <p className="text-xs opacity-60">{hint}</p>}
    </div>
  );
}
