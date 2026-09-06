import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getStats() {
  const nowIso = new Date().toISOString();

  const { count: totalCount } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true });

  const { count: dueCount } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .lte("next_review_date", nowIso);

  return {
    total: totalCount ?? 0,
    due: dueCount ?? 0,
  };
}

export default async function HomePage() {
  const { total, due } = await getStats();

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900">
          📚 Flashcard <span className="text-indigo-600">Anki Klonu</span>
        </h1>
        <p className="text-slate-500">
          Fotoğraftan kelime çıkar, aralıklı tekrar (SM-2) algoritmasıyla kalıcı öğren.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-10 max-w-2xl w-full">
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-400">Toplam Kelime</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{total}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-400">Bugün Tekrar Edilecek</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{due}</p>
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
          🧠 Çalışma Modu {due > 0 && `(${due})`}
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
