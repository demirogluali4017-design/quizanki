import Link from "next/link";
import { READINGS } from "@/lib/readings";

export const dynamic = "force-dynamic";

export default function ReadIndexPage() {
  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Okuma</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Bugün beş parça. Gazeteden kopya değil, YDS konularında yeniden yazılmış metin.
            Fiiller boyalı gelir. Bağlaç ve gönderim ayrıca açılır. Çeviri sorudan sonradır.
          </p>
        </header>
        <div className="space-y-3">
          {READINGS.map((passage, index) => (
            <Link
              key={passage.id}
              href={`/read/${passage.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                {index + 1}. {passage.topic}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{passage.title}</h2>
              <p className="mt-2 text-xs text-slate-400">{passage.minutes} dk · 4 soru</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
