import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/fetchAll";
import { buildDailyPackage } from "@/lib/studyEngine";
import { Flashcard } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

async function getPackageSize() {
  const cards = await fetchAllRows<Flashcard>((from, to) =>
    supabase.from("flashcards").select("*").range(from, to)
  );
  const pkg = buildDailyPackage(cards);
  const newCount = cards.filter((c) => c.repetitions === 0).length;
  return { totalCount: pkg.totalCount, cardCount: cards.length, newCount };
}

export default async function StudyModeSelectPage() {
  const { totalCount, cardCount, newCount } = await getPackageSize();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-300">Çalışma</p>
          <h1 className="mt-2 text-3xl text-slate-900 dark:text-slate-50 sm:text-4xl">Mod seç</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Öğren motoru tekrarı kaydeder. Diğer modlar sadece pratiktir, SM-2 verisine dokunmaz.
          </p>
        </div>

        <div className="space-y-3">
          <ModeCard
            href="/study/learn"
            mark="01"
            title="Öğren"
            recommended
            description="Ana motor — SM-2 aralıklı tekrar, öz-değerlendirme ve karışık soru tipleriyle bilimsel çalışma."
            badge={totalCount > 0 ? `${totalCount} kelime hazır` : "Bugün için paket boş"}
          />
          <ModeCard
            href="/study/new"
            mark="02"
            title="Sıfırdan öğren"
            description="Sadece hiç tekrar edilmemiş kelimeler — mevcut tekrarlarla karışmaz."
            badge={newCount > 0 ? `${newCount} yeni kelime` : "Hiç yeni kelime yok"}
          />
          <ModeCard
            href="/study/cards"
            mark="03"
            title="Kartlar"
            description="Puansız, serbest gezinme. SM-2 verisine hiç dokunmaz — sadece gözden geçirmek için."
            badge={`${cardCount} kelime`}
          />
          <ModeCard
            href="/study/test"
            mark="04"
            title="Test"
            description="Kendini sına — sonunda başarı yüzdeni gösteren hızlı bir sınav modu. SM-2'yi etkilemez."
            badge={`${cardCount} kelime havuzu`}
          />
          <ModeCard
            href="/study/match"
            mark="05"
            title="Eşleştir"
            description="Kelimeyi anlamıyla eşleştir, süreni tut. Kendi en hızlı rekoruna karşı yarış. SM-2'yi etkilemez."
            badge={`${cardCount} kelime havuzu`}
          />
        </div>
      </div>
    </main>
  );
}

function ModeCard({
  href,
  mark,
  title,
  description,
  badge,
  recommended,
}: {
  href: string;
  mark: string;
  title: string;
  description: string;
  badge: string;
  recommended?: boolean;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-start gap-4">
        <span className="font-display text-sm tabular-nums text-indigo-700 dark:text-indigo-300">{mark}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl text-slate-900 dark:text-slate-50">{title}</h2>
            {recommended && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Önerilen
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-400">{badge}</p>
        </div>
      </div>
    </Link>
  );
}
