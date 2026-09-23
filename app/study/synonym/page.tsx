"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/fetchAll";
import { Flashcard } from "@/types";

const MAX_PAIRS = 6;
const BEST_KEY = "quizanki:synonym-best";

type Phase = "loading" | "empty" | "running" | "finished";

interface Tile {
  key: string;
  cardId: string;
  groupId: string;
  word: string;
  meaning: string;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function readBest(pairs: number): number | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, number>;
    return typeof parsed[String(pairs)] === "number" ? parsed[String(pairs)] : null;
  } catch {
    return null;
  }
}

function writeBest(pairs: number, ms: number) {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    parsed[String(pairs)] = ms;
    localStorage.setItem(BEST_KEY, JSON.stringify(parsed));
  } catch {
    // rekor kaydı isteğe bağlı
  }
}

export default function SynonymMatchPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [pairCount, setPairCount] = useState(0);
  const [matchedGroups, setMatchedGroups] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Tile[]>([]);
  const [wrongFlash, setWrongFlash] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [lastPair, setLastPair] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [personalBestMs, setPersonalBestMs] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poolRef = useRef<Flashcard[]>([]);

  function setupRound(pool: Flashcard[]) {
    const byGroup = new Map<string, Flashcard[]>();
    for (const card of pool) {
      if (!card.group_id) continue;
      const list = byGroup.get(card.group_id) ?? [];
      list.push(card);
      byGroup.set(card.group_id, list);
    }
    const playable = [...byGroup.values()].filter((group) => group.length >= 2);
    if (playable.length === 0) {
      setTiles([]);
      setPairCount(0);
      setPhase("empty");
      return;
    }

    const pickedGroups = shuffle(playable).slice(0, MAX_PAIRS);
    const nextTiles: Tile[] = [];
    for (const group of pickedGroups) {
      const [left, right] = shuffle(group).slice(0, 2);
      nextTiles.push(
        {
          key: `a-${left.id}`,
          cardId: left.id,
          groupId: left.group_id as string,
          word: left.word,
          meaning: left.meaning,
        },
        {
          key: `b-${right.id}`,
          cardId: right.id,
          groupId: right.group_id as string,
          word: right.word,
          meaning: right.meaning,
        }
      );
    }

    setTiles(shuffle(nextTiles));
    setPairCount(pickedGroups.length);
    setMatchedGroups(new Set());
    setSelected([]);
    setWrongFlash(new Set());
    setMistakes(0);
    setLastPair(null);
    setElapsedMs(0);
    setFinalDuration(0);
    setIsNewRecord(false);
    setStartedAt(null);
    setPersonalBestMs(readBest(pickedGroups.length));
    setPhase("running");
  }

  useEffect(() => {
    async function setup() {
      setPhase("loading");
      const cards = await fetchAllRows<Flashcard>((from, to) =>
        supabase.from("flashcards").select("*").range(from, to)
      );
      poolRef.current = cards;
      setupRound(cards);
    }
    setup();
  }, []);

  useEffect(() => {
    if (phase === "running" && startedAt !== null) {
      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAt);
      }, 100);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, startedAt]);

  function finishRound(matchedSize: number, duration: number) {
    setFinalDuration(duration);
    setPhase("finished");
    if (tickRef.current) clearInterval(tickRef.current);
    const best = readBest(matchedSize);
    const beat = best === null || duration < best;
    setIsNewRecord(beat);
    if (beat) {
      writeBest(matchedSize, duration);
      setPersonalBestMs(duration);
    }
  }

  function handleTileClick(tile: Tile) {
    if (phase !== "running") return;
    if (matchedGroups.has(tile.groupId)) return;
    if (selected.some((item) => item.key === tile.key)) return;
    if (selected.length === 2) return;

    const start = startedAt ?? Date.now();
    if (startedAt === null) setStartedAt(start);

    const nextSelected = [...selected, tile];
    setSelected(nextSelected);
    if (nextSelected.length < 2) return;

    const [a, b] = nextSelected;
    if (a.groupId === b.groupId) {
      const nextMatched = new Set(matchedGroups);
      nextMatched.add(a.groupId);
      setMatchedGroups(nextMatched);
      setSelected([]);
      setLastPair(`${a.word} = ${b.word}`);
      if (nextMatched.size === pairCount) finishRound(pairCount, Date.now() - start);
      return;
    }

    setMistakes((count) => count + 1);
    setWrongFlash(new Set([a.key, b.key]));
    setTimeout(() => {
      setWrongFlash(new Set());
      setSelected([]);
    }, 600);
  }

  if (phase === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 dark:text-slate-500">Yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">🔁 Eş Anlamlı</h1>
          <Link href="/study" className="text-sm text-indigo-600 hover:underline">
            ← Mod seçimine dön
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Aynı gruptaki iki kelimeyi eşleştir. Örneğin se former = établir. SM-2 tekrar planını etkilemez.
        </p>

        {phase === "empty" && (
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center space-y-3">
            <p className="text-4xl">🔁</p>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">Eş anlamlı grup yok.</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              En az iki kelimesi olan bir grup gerekir. Kelimeler sayfasından gruplayabilirsin.
            </p>
            <Link href="/words" className="inline-block text-sm text-indigo-600 hover:underline">
              Kelimelere git
            </Link>
          </div>
        )}

        {(phase === "running" || phase === "finished") && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                ⏱️ {formatDuration(phase === "finished" ? finalDuration : elapsedMs)}
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                {matchedGroups.size} / {pairCount} eşleşti · {mistakes} hata
              </span>
            </div>

            {lastPair && phase === "running" && (
              <p className="text-center text-sm text-indigo-700 dark:text-indigo-300">{lastPair}</p>
            )}

            {phase === "running" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tiles.map((tile) => {
                  const isMatched = matchedGroups.has(tile.groupId);
                  const isSelected = selected.some((item) => item.key === tile.key);
                  const isWrong = wrongFlash.has(tile.key);
                  let classes =
                    "rounded-xl border px-3 py-4 text-center transition-all min-h-[76px] flex flex-col items-center justify-center gap-1 ";
                  if (isMatched) {
                    classes += "border-green-300 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300";
                  } else if (isWrong) {
                    classes += "border-red-400 bg-red-50 dark:bg-red-950 text-red-600";
                  } else if (isSelected) {
                    classes += "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700";
                  } else {
                    classes +=
                      "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-indigo-300";
                  }

                  return (
                    <button
                      key={tile.key}
                      onClick={() => handleTileClick(tile)}
                      disabled={isMatched}
                      className={classes}
                    >
                      <span className="text-sm font-semibold">{tile.word}</span>
                      {isMatched && <span className="text-[11px] text-slate-500 dark:text-slate-400">{tile.meaning}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {phase === "finished" && (
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center space-y-4">
                {isNewRecord && (
                  <div className="inline-block bg-amber-100 dark:bg-amber-950 text-amber-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    🏆 Yeni Rekor!
                  </div>
                )}
                <p className="text-4xl">🎉</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tamamlandı!</p>
                <p className="text-5xl font-mono font-extrabold text-indigo-600">{formatDuration(finalDuration)}</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">{mistakes} hata ile bitirdin</p>
                {personalBestMs !== null && !isNewRecord && (
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Kişisel rekorun: {formatDuration(personalBestMs)}
                  </p>
                )}
                <ul className="text-left space-y-2">
                  {tiles
                    .filter((tile) => tile.key.startsWith("a-"))
                    .map((left) => {
                      const right = tiles.find((tile) => tile.groupId === left.groupId && tile.key !== left.key);
                      if (!right) return null;
                      return (
                        <li key={left.groupId} className="rounded-xl bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{left.word}</span>
                          <span className="text-slate-400"> = </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{right.word}</span>
                          <span className="block text-xs text-slate-500 mt-1">
                            {left.meaning} · {right.meaning}
                          </span>
                        </li>
                      );
                    })}
                </ul>
                <button
                  onClick={() => setupRound(poolRef.current)}
                  className="rounded-xl bg-indigo-600 text-white font-medium px-6 py-3 hover:bg-indigo-700 transition-colors"
                >
                  Yeniden Başla
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
