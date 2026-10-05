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
    <div className="mx-auto h-[70vh] min-h-[26rem] w-full max-w-xl select-none [perspective:1500px] sm:h-[32rem]">
      <div
        onClick={onFlip}
        className={`relative h-full w-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-[2rem] bg-indigo-600 px-6 py-10 [backface-visibility:hidden]">
          <div className="flex items-start gap-3">
            <h2 className="text-center text-5xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
              {card.word}
            </h2>
            <SpeakButton text={card.word} />
          </div>
          {card.preposition && (
            <p className="text-xl font-semibold text-amber-200">{card.preposition}</p>
          )}
          <p className="mt-2 text-sm text-indigo-100">Cevabı görmek için dokun</p>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-[2rem] bg-amber-300 px-6 py-10 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-900/70">Türkçe</p>
          <h3 className="text-4xl font-semibold leading-tight text-slate-900">{card.meaning}</h3>
          {card.example_sentence && (
            <p className="mt-2 text-xl leading-relaxed text-slate-800">{card.example_sentence}</p>
          )}
        </div>
      </div>
    </div>
  );
}
