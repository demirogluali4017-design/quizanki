"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { calculateSM2 } from "@/lib/sm2";
import { Flashcard, SM2Rating } from "@/types";
import FlashCardView from "@/components/FlashCardView";

export default function StudyPage() {
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchDueCards = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .lte("next_review_date", new Date().toISOString())
      .order("next_review_date", { ascending: true });

    if (!error && data) {
      setQueue(data as Flashcard[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDueCards();
  }, [fetchDueCards]);

  const currentCard = queue[0];

  async function handleRate(rating: SM2Rating) {
    if (!currentCard || submitting) return;
    setSubmitting(true);

    const result = calculateSM2(
      {
        repetitions: currentCard.repetitions,
        interval: currentCard.interval,
        ease_factor: currentCard.ease_factor,
      },
      rating
    );

    const { error } = await supabase
      .from("flashcards")
      .update({
        repetitions: result.repetitions,
        interval: result.interval,
        ease_factor: result.ease_factor,
        next_review_date: result.next_review_date,
      })
      .eq("id", currentCard.id);

    if (error) {
      alert("Kart güncellenirken hata oluştu: " + error.message);
      setSubmitting(false);
      return;
    }

    setReviewedCount((c) => c + 1);
    setQueue((q) => q.slice(1));
    setIsFlipped(false);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">🧠 Çalışma Modu</h1>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            ← Ana sayfaya dön
          </Link>
        </div>

        {!currentCard ? (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-12 text-center space-y-3">
            <p className="text-4xl">🎉</p>
            <p className="text-lg font-semibold text-slate-800">
              Bugünlük tekrar edilecek kart kalmadı!
            </p>
            <p className="text-slate-500 text-sm">
              {reviewedCount > 0
                ? `Bu oturumda ${reviewedCount} kart tekrar ettin.`
                : "Yeni kartlar yüklemek için 'Kart Yükle' sayfasına git."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-slate-400">
              Kalan kart: <span className="font-semibold text-slate-600">{queue.length}</span>
            </p>

            <FlashCardView
              card={currentCard}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped((f) => !f)}
            />

            {isFlipped && (
              <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto">
                <button
                  onClick={() => handleRate(1)}
                  disabled={submitting}
                  className="rounded-xl bg-red-100 text-red-700 font-semibold py-3 hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  😖 Zor
                </button>
                <button
                  onClick={() => handleRate(3)}
                  disabled={submitting}
                  className="rounded-xl bg-amber-100 text-amber-700 font-semibold py-3 hover:bg-amber-200 transition-colors disabled:opacity-50"
                >
                  🙂 Orta
                </button>
                <button
                  onClick={() => handleRate(5)}
                  disabled={submitting}
                  className="rounded-xl bg-green-100 text-green-700 font-semibold py-3 hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  😄 Kolay
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
