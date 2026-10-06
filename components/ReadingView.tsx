"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { invalidateCardCache } from "@/lib/cardCache";
import { ReadingPassage } from "@/lib/readings";

type Layer = "v" | "c" | "r";

const LAYER_LABEL: Record<Layer, string> = {
  v: "Fiil",
  c: "Bağlaç",
  r: "Gönderim",
};

export default function ReadingView({ passage }: { passage: ReadingPassage }) {
  const router = useRouter();
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ v: true, c: false, r: false });
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const score = useMemo(() => {
    if (!checked) return 0;
    return passage.questions.reduce((sum, question, index) => sum + (picked[index] === question.answer ? 1 : 0), 0);
  }, [checked, passage.questions, picked]);

  function toggle(layer: Layer) {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }

  function chooseWord(raw: string) {
    const word = raw.replace(/^[«"']+|[»"'.:,;!?]+$/g, "").trim();
    if (!word) return;
    setSelectedWord(word);
    setMeaning("");
    setSaveNote(null);
  }

  async function saveWord() {
    if (!selectedWord || !meaning.trim() || saving) return;
    setSaving(true);
    setSaveNote(null);
    const sentence = passage.paragraphs
      .map((item) => item.replace(/\[\[(?:v|c|r):([^\]]+)\]\]/g, "$1"))
      .find((item) => item.toLocaleLowerCase("fr").includes(selectedWord.toLocaleLowerCase("fr"))) ?? "";
    const response = await fetch("/api/add-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: selectedWord,
        meaning: meaning.trim(),
        example_sentence: sentence,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setSaveNote(body.error ?? "Kelime kaydedilemedi.");
      return;
    }
    invalidateCardCache();
    setSaveNote("Karta eklendi. Yarınki pakete girebilir.");
    setMeaning("");
  }

  return (
    <main className="min-h-screen px-5 pb-8 pt-6">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/read")} className="text-sm font-medium text-indigo-600">
            Parçalar
          </button>
          <span className="text-xs text-slate-400">{passage.minutes} dk</span>
        </div>

        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{passage.topic}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{passage.title}</h1>
          <p className="mt-2 text-xs text-slate-400">{passage.sourceNote}. Çeviri sorulardan sonra açılır.</p>
        </header>

        <div className="flex gap-2">
          {(Object.keys(LAYER_LABEL) as Layer[]).map((layer) => (
            <button
              key={layer}
              onClick={() => toggle(layer)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                layers[layer]
                  ? layer === "v"
                    ? "bg-indigo-600 text-white"
                    : layer === "c"
                      ? "bg-amber-400 text-slate-900"
                      : "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800"
              }`}
            >
              {LAYER_LABEL[layer]}
            </button>
          ))}
        </div>

        <article className="space-y-4 rounded-[1.5rem] bg-white p-5 text-[17px] leading-8 text-slate-800 shadow-sm dark:bg-slate-900 dark:text-slate-100">
          {passage.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>
              <MarkedText text={paragraph} layers={layers} onWord={chooseWord} />
            </p>
          ))}
        </article>

        {selectedWord && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500">Karta eklenecek kelime</p>
            <p className="text-lg font-semibold">{selectedWord}</p>
            <input
              value={meaning}
              onChange={(event) => setMeaning(event.target.value)}
              placeholder="Türkçe anlam"
              className="mt-3 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700"
            />
            <button
              onClick={saveWord}
              disabled={saving || !meaning.trim()}
              className="mt-3 h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Karta ekle"}
            </button>
            {saveNote && <p className="mt-2 text-sm text-slate-500">{saveNote}</p>}
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Dört soru</h2>
          {passage.questions.map((question, index) => (
            <div key={question.prompt} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{question.kind}</p>
              <p className="mt-1 font-medium">{question.prompt}</p>
              <div className="mt-3 space-y-2">
                {question.options.map((option, optionIndex) => {
                  const selected = picked[index] === optionIndex;
                  const show = checked && (selected || optionIndex === question.answer);
                  const correct = optionIndex === question.answer;
                  return (
                    <button
                      key={option}
                      onClick={() => setPicked((current) => ({ ...current, [index]: optionIndex }))}
                      disabled={checked}
                      className={`block w-full rounded-xl border px-3 py-2 text-left text-sm ${
                        show && correct
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950"
                          : show && selected
                            ? "border-red-300 bg-red-50 dark:bg-red-950"
                            : selected
                              ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                              : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {checked && <p className="mt-2 text-sm text-slate-500">{question.why}</p>}
            </div>
          ))}
          {!checked ? (
            <button
              onClick={() => setChecked(true)}
              disabled={Object.keys(picked).length < passage.questions.length}
              className="h-12 w-full rounded-2xl bg-amber-300 text-base font-semibold text-slate-900 disabled:opacity-50"
            >
              Cevapları gör
            </button>
          ) : (
            <p className="text-center text-sm text-slate-500">{score} / {passage.questions.length} doğru</p>
          )}
        </section>

        <section className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
          <button onClick={() => setShowSummary((value) => !value)} className="text-sm font-semibold text-indigo-600">
            {showSummary ? "Türkçe özeti gizle" : "Türkçe özeti aç"}
          </button>
          {showSummary && <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{passage.summaryTr}</p>}
        </section>

        <Link href="/read" className="block text-center text-sm font-medium text-indigo-600">
          Diğer parçalara dön
        </Link>
      </div>
    </main>
  );
}

function MarkedText({
  text,
  layers,
  onWord,
}: {
  text: string;
  layers: Record<Layer, boolean>;
  onWord: (word: string) => void;
}) {
  const parts = text.split(/(\[\[(?:v|c|r):[^\]]+\]\])/g);
  return (
    <>
      {parts.map((part, index) => {
        const marked = part.match(/^\[\[(v|c|r):([^\]]+)\]\]$/);
        if (!marked) {
          return <PlainWords key={index} text={part} onWord={onWord} />;
        }
        const kind = marked[1] as Layer;
        const active = layers[kind];
        return (
          <button
            key={index}
            onClick={() => onWord(marked[2])}
            className={
              active
                ? kind === "v"
                  ? "font-semibold text-indigo-700 underline decoration-indigo-300 dark:text-indigo-300"
                  : kind === "c"
                    ? "rounded bg-amber-200 px-1 font-semibold text-amber-950"
                    : "font-semibold text-emerald-700 underline decoration-emerald-300 dark:text-emerald-300"
                : "text-inherit"
            }
          >
            {marked[2]}
          </button>
        );
      })}
    </>
  );
}

function PlainWords({ text, onWord }: { text: string; onWord: (word: string) => void }) {
  const bits = text.split(/(\s+)/);
  return (
    <>
      {bits.map((bit, index) =>
        bit.trim() ? (
          <button key={index} onClick={() => onWord(bit)} className="hover:text-indigo-600">
            {bit}
          </button>
        ) : (
          <span key={index}>{bit}</span>
        )
      )}
    </>
  );
}
