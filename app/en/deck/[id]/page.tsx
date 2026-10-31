"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getEnDeck } from "@/lib/en/ydsData";
import { loadEnProgress, rateEnCard, isDue } from "@/lib/en/enProgress";
import { SM2Rating } from "@/types";

const BUTTONS: { r: SM2Rating; label: string }[] = [
  { r: 1, label: "Unuttum" }, { r: 2, label: "Zorlandım" }, { r: 3, label: "Hatırladım" }, { r: 5, label: "Çok kolay" },
];

export default function EnDeck({ params }: { params: { id: string } }) {
  const deck = getEnDeck(params.id);
  const [queue, setQueue] = useState<string[] | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!deck) return;
    const p = loadEnProgress();
    setQueue(deck.cards.filter((c) => isDue(p[`${deck.id}:${c.word}`])).map((c) => c.word));
  }, [deck]);

  const card = useMemo(() => (deck && queue?.length ? deck.cards.find((c) => c.word === queue[0]) : undefined), [deck, queue]);

  if (!deck) return <main className="p-8">Deste bulunamadı. <Link href="/en" className="text-indigo-600">Geri</Link></main>;

  const rate = (r: SM2Rating) => {
    if (!card || !queue) return;
    rateEnCard(deck.id, card.word, r);
    setQueue(r === 1 ? [...queue.slice(1), card.word] : queue.slice(1));
    setShown(false);
  };

  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <Link href="/en" className="text-sm text-indigo-600 hover:underline">← Desteler</Link>
      <h1 className="mt-3 text-xl font-semibold">{deck.title}</h1>
      <p className="text-sm text-slate-500">Kalan: {queue?.length ?? "…"}</p>
      {queue && !card && <p className="mt-10 text-center text-lg">Bu destede bugün çalışılacak kart kalmadı 🎉</p>}
      {card && (
        <div className="mt-8 rounded-2xl border border-slate-200 p-8 text-center dark:border-slate-700">
          <div className="text-4xl font-semibold">{card.word}</div>
          {card.pos && <div className="mt-1 text-sm text-slate-500">({card.pos})</div>}
          {shown ? (
            <div className="mt-6 space-y-2">
              {card.tr && <div className="text-2xl">{card.tr}</div>}
              {card.note && <div className="text-lg">{card.note}</div>}
              {card.example && <div className="italic text-slate-600">{card.example}</div>}
              {!card.tr && !card.note && !card.example && (
                <div className="text-sm text-slate-500">Kaynakta Türkçe anlam yok — anlamı kendin hatırla.</div>
              )}
              <div className="text-xs text-slate-400">Sıklık sırası #{card.rank}</div>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {BUTTONS.map((b) => (
                  <button key={b.r} onClick={() => rate(b.r)} className="rounded-xl bg-indigo-600 py-3 font-semibold text-white">{b.label}</button>
                ))}
              </div>
            </div>
          ) : (
            <button onClick={() => setShown(true)} className="mt-8 w-full rounded-xl bg-slate-900 py-3 font-semibold text-white dark:bg-slate-100 dark:text-slate-900">Göster</button>
          )}
        </div>
      )}
    </main>
  );
}
