"use client";

import { Flashcard } from "@/types";

interface FlashCardViewProps {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}

export default function FlashCardView({ card, isFlipped, onFlip }: FlashCardViewProps) {
  return (
    <div className="[perspective:1500px] w-full max-w-xl mx-auto h-80 select-none">
      <div
        onClick={onFlip}
        className={`relative w-full h-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* ÖN YÜZ: Kelime + Preposition */}
        <div className="absolute inset-0 [backface-visibility:hidden] flex flex-col items-center justify-center gap-3 rounded-2xl bg-white shadow-xl border border-slate-200 p-8">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">
            Kelime
          </span>
          <h2 className="text-4xl font-bold text-slate-800 text-center">
            {card.word}
            {card.preposition && (
              <span className="text-indigo-500"> {card.preposition}</span>
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-4">Cevabı görmek için karta tıkla</p>
        </div>

        {/* ARKA YÜZ: Anlam + Örnek Cümle */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center gap-4 rounded-2xl bg-indigo-600 shadow-xl p-8 text-center">
          <span className="text-xs uppercase tracking-widest text-indigo-200 font-medium">
            Anlam
          </span>
          <h3 className="text-3xl font-bold text-white">{card.meaning}</h3>
          {card.example_sentence && (
            <p className="text-indigo-100 italic mt-2 text-lg">
              &ldquo;{card.example_sentence}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
