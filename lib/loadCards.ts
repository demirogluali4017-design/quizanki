import { Flashcard } from "@/types";

const PAGE_SIZE = 1000;

export const FULL_COLUMNS =
  "id,created_at,word,preposition,meaning,example_sentence,repetitions,interval,ease_factor,next_review_date,correct_count,incorrect_count,struggle_count,is_weak,last_reviewed_at,in_learning_phase,learning_streak,group_id";

export const STATS_COLUMNS =
  "id,repetitions,interval,next_review_date,correct_count,incorrect_count,is_weak,group_id";

export async function fetchAllFlashcards(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  columns = FULL_COLUMNS
): Promise<Flashcard[]> {
  const head = await supabase.from("flashcards").select("id", { count: "exact", head: true });
  const count = head.error ? 0 : (head.count ?? 0);

  if (head.error || count === 0) {
    const first = await supabase.from("flashcards").select(columns).range(0, PAGE_SIZE - 1);
    return (first.data ?? []) as Flashcard[];
  }

  const pages = Math.ceil(count / PAGE_SIZE);
  const chunks = await Promise.all(
    Array.from({ length: pages }, (_, index) => {
      const from = index * PAGE_SIZE;
      return supabase.from("flashcards").select(columns).range(from, from + PAGE_SIZE - 1);
    })
  );

  const cards: Flashcard[] = [];
  for (const chunk of chunks) {
    if (chunk.data) cards.push(...chunk.data);
  }
  return cards;
}
