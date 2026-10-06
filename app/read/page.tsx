import Link from "next/link";
import ReadingComposer from "@/components/ReadingComposer";
import { fetchLiveArticles } from "@/lib/liveArticles";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type DailyReading = {
  id: string;
  topic: string;
  title: string;
  minutes: number;
  source_title: string | null;
};

async function loadToday(): Promise<DailyReading[]> {
  try {
    const supabase = createServiceRoleClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("readings")
      .select("id, topic, title, minutes, source_title")
      .eq("created_on", today)
      .order("title");
    return (data ?? []) as DailyReading[];
  } catch {
    return [];
  }
}

export default async function ReadIndexPage() {
  const daily = await loadToday();
  const live = await fetchLiveArticles();

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Okuma</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Aşağıdaki haberler akıştan gelen gerçek makaleler. Link, o makalenin kendi sayfasını açar.
            Tam metin orada durur. Burada makale uydurulmaz.
          </p>
        </header>
        <ReadingComposer />
        {daily.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-500">Bugün kaynaktan</h2>
            {daily.map((passage, index) => (
              <Link
                key={passage.id}
                href={`/read/daily/${passage.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                  {index + 1}. {passage.topic}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{passage.title}</h2>
                <p className="mt-2 text-xs text-slate-400">{passage.minutes} dk · kaynak yalnız başlık</p>
              </Link>
            ))}
          </div>
        )}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500">Gerçek makaleler</h2>
          {live.map((article) => (
            <a
              key={article.url}
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{article.source}</p>
              <h2 className="mt-1 text-lg font-semibold">{article.title}</h2>
              {article.excerpt && <p className="mt-2 text-sm leading-6 text-slate-500">{article.excerpt}</p>}
              <p className="mt-3 break-all text-xs text-indigo-600 underline">{article.url}</p>
            </a>
          ))}
          {live.length === 0 && <p className="text-sm text-slate-500">Akış şu an makale adresi döndürmedi.</p>}
        </div>
      </div>
    </main>
  );
}
