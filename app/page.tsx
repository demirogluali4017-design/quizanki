import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { buildDailyPackage } from "@/lib/studyEngine";
import { Flashcard } from "@/types";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const { data, error } = await supabase.from("flashcards").select("*");
  const cards = (error || !data ? [] : data) as Flashcard[];

  const pkg = buildDailyPackage(cards);

  const totalCorrect = cards.reduce((sum, c) => sum + (c.correct_count ?? 0), 0);
  const totalIncorrect = cards.reduce((sum, c) => sum + (c.incorrect_count ?? 0), 0);
  const totalAnswers = totalCorrect + totalIncorrect;
  const successRate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : null;

  const longTermCount = cards.filter((c) => c.repetitions > 0 && c.interval >= 30).length;

  return {
    total: cards.length,
    pkg,
    successRate,
    longTermCount,
  };
}

export default async function HomePage() {
  const { total, pkg, successRate, longTermCount } = await getDashboardData();

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900">
          📚 Flashcard <span className="text-indigo-600">Anki Klonu</span>
        </h1>
        <p className="text-slate-500">
          Fotoğraftan Fransızca kelime çıkar, SM-2 tabanlı adaptif öğrenme motoruyla kalıcı öğren.
        </p>
      </div>

      {/* BUGÜN paketi */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 max-w-2xl w-full">
        <StatBox label="Gecikmiş" value={pkg.overdueCards.length} accent="text-red-600" />
        <StatBox label="Zayıf Kelime" value={pkg.weakCards.length} accent="text-orange-600" />
        <StatBox label="Tekrar" value={pkg.dueCards.length} accent="text-amber-600" />
        <StatBox label="Yeni" value={pkg.newCards.length} accent="text-indigo-600" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-4 max-w-2xl w-full">
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-400">📚 Toplam Kelime</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{total}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-400">📈 Başarı Oranı</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">
            {successRate !== null ? `%${successRate}` : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-400">🧠 Uzun Süreli Hafıza</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{longTermCount}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-10 max-w-2xl w-full">
        <Link
          href="/upload"
          className="rounded-xl bg-slate-900 text-white font-medium py-4 px-6 text-center hover:bg-slate-800 transition-colors"
        >
          ⬆️ Kart Yükle
        </Link>
        <Link
          href="/study"
          className="rounded-xl bg-indigo-600 text-white font-medium py-4 px-6 text-center hover:bg-indigo-700 transition-colors"
        >
          🧠 Çalışmaya Başla {pkg.totalCount > 0 && `(${pkg.totalCount})`}
        </Link>
        <Link
          href="/words"
          className="rounded-xl bg-white text-slate-800 font-medium py-4 px-6 text-center border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          📋 Tüm Kelimeler
        </Link>
      </div>
    </main>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4 text-center">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}
