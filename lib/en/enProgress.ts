"use client";

import { calculateSM2 } from "@/lib/sm2";
import { SM2Rating } from "@/types";

// İngilizce ilerlemesi YALNIZCA bu anahtarda tutulur; Fransızca (Supabase) verisine dokunulmaz.
const KEY = "quizanki:en:progress:v1";

export interface EnProgress { repetitions: number; interval: number; ease_factor: number; next_review_date: string }
type Store = Record<string, EnProgress>; // anahtar: `${deckId}:${word}`

export function loadEnProgress(): Store {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}

export function rateEnCard(deckId: string, word: string, rating: SM2Rating): Store {
  const store = loadEnProgress();
  const k = `${deckId}:${word}`;
  const cur = store[k] ?? { repetitions: 0, interval: 1, ease_factor: 2.5, next_review_date: "" };
  store[k] = calculateSM2(cur, rating);
  localStorage.setItem(KEY, JSON.stringify(store));
  return store;
}

export const isDue = (p?: EnProgress) => !p || new Date(p.next_review_date) <= new Date();
