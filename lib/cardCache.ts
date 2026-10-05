"use client";

import { supabase } from "@/lib/supabase";
import { Flashcard } from "@/types";
import { fetchAllFlashcards, FULL_COLUMNS } from "@/lib/loadCards";

const TTL_MS = 3 * 60 * 1000;

let memory: { at: number; cards: Flashcard[] } | null = null;
let inflight: Promise<Flashcard[]> | null = null;

export function invalidateCardCache() {
  memory = null;
}

export async function getCachedCards(): Promise<Flashcard[]> {
  if (memory && Date.now() - memory.at < TTL_MS) return memory.cards;
  if (!inflight) {
    inflight = fetchAllFlashcards(supabase, FULL_COLUMNS)
      .then((cards) => {
        memory = { at: Date.now(), cards };
        return cards;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
