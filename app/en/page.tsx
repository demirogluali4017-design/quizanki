"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EN_DECKS } from "@/lib/en/ydsData";
import { loadEnProgress, isDue, EnProgress } from "@/lib/en/enProgress";

export default function EnHome() {
  const [prog, setProg] = useState<Record<string, EnProgress>>({});
  useEffect(() => setProg(loadEnProgress()), []);
  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <Link href="/" className="text-sm text-indigo-600 hover:underline">← Dil seçimi</Link>
      <h1 className="mt-3 font-display text-3xl font-semibold">🇬🇧 İngilizce · YDS</h1>
      <p className="mt-2 text-xs text-slate-500">
        Kaynak: Öztürk (2018), akademik çalışma. Kartlarda Türkçe anlam yalnızca kaynakta varsa gösterilir.
      </p>
      <ul className="mt-6 space-y-2">
        {EN_DECKS.map((d) => {
          const due = d.cards.filter((c) => isDue(prog[`${d.id}:${c.word}`])).length;
          return (
            <li key={d.id}>
              <Link href={`/en/deck/${d.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <span className="font-medium">{d.title}</span>
                <span className="text-sm text-slate-500">{due}/{d.cards.length}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
