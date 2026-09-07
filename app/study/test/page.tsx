"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Flashcard, StudyQuestion } from "@/types";
import { buildTestQuestion } from "@/lib/studyEngine";

const TEST_LENGTH = 15;

type Phase = "loading" | "empty" | "running" | "answered" | "finished";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function TestModePage() {
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [questions, setQuestions] = useState<StudyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    async function setup() {
      setPhase("loading");
      const { data, error } = await supabase.from("flashcards").select("*");

      if (error || !data || data.length === 0) {
        setPhase("empty");
        return;
      }

      const cards = data as Flashcard[];
      setAllCards(cards);

      const picked = shuffle(cards).slice(0, Math.min(TEST_LENGTH, cards.length));
      const builtQuestions = picked.map((card) => buildTestQuestion(card, cards));

      setQuestions(builtQuestions);
      setPhase(builtQuestions.length > 0 ? "running" : "empty");
    }
    setup();
  }, []);

  function handleSelect(option: string) {
    if (phase !== "running") return;
    setSelectedOption(option);
    setPhase("answered");

    const current = questions[currentIndex];
    if (option === current.correctAnswer) {
      setCorrectCount((c) => c + 1);
    }
  }

  function handleContinue() {
    const nextIndex = currentIndex + 1;
    setSelectedOption(null);

    if (nextIndex >= questions.length) {
      setPhase("finished");
    } else {
      setCurrentIndex(nextIndex);
      setPhase("running");
    }
  }

  function handleRestart() {
    const picked = shuffle(allCards).slice(0, Math.min(TEST_LENGTH, allCards.length));
    const builtQuestions = picked.map((card) => buildTestQuestion(card, allCards));
    setQuestions(builtQuestions);
    setCurrentIndex(0);
    setCorrectCount(0);
    setSelectedOption(null);
    setPhase("running");
  }

  if (phase === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Yükleniyor...</p>
      </main>
    );
  }

  const current = questions[currentIndex];
  const answered = phase === "answered";

  const promptText =
    current?.type === "mcq_fr_to_tr"
      ? "Bu kelimenin Türkçe anlamı nedir?"
      : current?.type === "mcq_tr_to_fr"
        ? "Bu anlama gelen Fransızca kelime hangisi?"
        : "Boşluğu doğru kelimeyle tamamla:";

  const promptHeading =
    current?.type === "mcq_fr_to_tr"
      ? current.card.word
      : current?.type === "mcq_tr_to_fr"
        ? current.card.meaning
        : current?.blankedSentence;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">📝 Test Modu</h1>
          <Link href="/study" className="text-sm text-indigo-600 hover:underline">
            ← Mod seçimine dön
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400">
          Bu mod SM-2 tekrar planını ETKİLEMEZ — sadece kendini sınamak içindir.
        </p>

        {phase === "empty" && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-12 text-center space-y-3">
            <p className="text-4xl">📝</p>
            <p className="text-lg font-semibold text-slate-800">
              Test için yeterli kelime yok.
            </p>
            <p className="text-slate-500 text-sm">
              Önce &apos;Kart Yükle&apos; sayfasından kelime ekle.
            </p>
          </div>
        )}

        {phase === "finished" && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-12 text-center space-y-4">
            <p className="text-4xl">🏁</p>
            <p className="text-lg font-semibold text-slate-800">Test bitti!</p>
            <p className="text-4xl font-extrabold text-indigo-600">
              {correctCount} / {questions.length}
            </p>
            <p className="text-slate-500 text-sm">
              %{Math.round((correctCount / questions.length) * 100)} başarı oranı
            </p>
            <button
              onClick={handleRestart}
              className="rounded-xl bg-indigo-600 text-white font-medium px-6 py-3 hover:bg-indigo-700 transition-colors"
            >
              Yeniden Başla
            </button>
          </div>
        )}

        {(phase === "running" || phase === "answered") && current && (
          <div className="space-y-6">
            <p className="text-center text-sm text-slate-400">
              Soru {currentIndex + 1} / {questions.length} · Doğru: {correctCount}
            </p>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center space-y-3">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">
                {promptText}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">{promptHeading}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {current.options?.map((option) => {
                const isCorrect = option === current.correctAnswer;
                const isSelected = option === selectedOption;

                let classes = "rounded-xl border px-4 py-3 text-left font-medium transition-colors ";
                if (!answered) {
                  classes += "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50";
                } else if (isCorrect) {
                  classes += "border-green-400 bg-green-50 text-green-700";
                } else if (isSelected && !isCorrect) {
                  classes += "border-red-400 bg-red-50 text-red-700";
                } else {
                  classes += "border-slate-200 bg-white opacity-50";
                }

                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    disabled={answered}
                    className={classes}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {answered && (
              <button
                onClick={handleContinue}
                className="w-full rounded-xl bg-indigo-600 text-white font-medium py-3 hover:bg-indigo-700 transition-colors"
              >
                {currentIndex + 1 >= questions.length ? "Sonucu Gör →" : "Sonraki Soru →"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
