"use client";

import { Flashcard } from "@/types";
import SpeakButton from "@/components/SpeakButton";

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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl [backface-visibility:hidden] dark:border-slate-700 dark:bg-slate-800">
          <span className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 font-medium">
            Kelime
          </span>
          <div className="flex items-center gap-3">
            <h2 className="text-center font-display text-4xl text-slate-900 dark:text-slate-50 sm:text-5xl">
              {card.word}
              {card.preposition && (
                <span className="text-indigo-500"> {card.preposition}</span>
              )}
            </h2>
            <SpeakButton text={card.word} />
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-4">Cevabı görmek için karta tıkla</p>
        </div>

        {/* ARKA YÜZ: Anlam + Örnek Cümle */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900 p-8 text-center text-white shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-300">
            Anlam
          </span>
          <h3 className="text-3xl text-white">{card.meaning}</h3>
          {card.example_sentence && (
            <p className="mt-2 text-lg italic text-slate-200">
              &ldquo;{card.example_sentence}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
