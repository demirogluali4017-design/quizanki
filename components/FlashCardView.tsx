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
    <div className="mx-auto h-[22rem] w-full max-w-xl select-none [perspective:1500px] sm:h-96">
      <div
        onClick={onFlip}
        className={`relative h-full w-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm [backface-visibility:hidden] dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <h2 className="text-center text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
              {card.word}
            </h2>
            <SpeakButton text={card.word} />
          </div>
          {card.preposition && (
            <p className="text-lg font-medium text-indigo-600">{card.preposition}</p>
          )}
          <p className="mt-2 text-sm text-slate-400">Cevabı görmek için dokun</p>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-400">Türkçe</p>
          <h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{card.meaning}</h3>
          {card.example_sentence && (
            <p className="mt-2 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              {card.example_sentence}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
