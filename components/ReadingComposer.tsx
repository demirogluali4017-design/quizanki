"use client";

import { useState } from "react";
import ReadingView from "@/components/ReadingView";
import { ReadingPassage } from "@/lib/readings";

export default function ReadingComposer() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passage, setPassage] = useState<ReadingPassage | null>(null);

  async function formatText() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/format-reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(body.error ?? "Düzenlenemedi.");
      return;
    }
    setPassage(body.passage);
  }

  if (passage) {
    return (
      <div>
        <button onClick={() => setPassage(null)} className="mb-3 text-sm font-medium text-indigo-600">
          Başka metin düzenle
        </button>
        <ReadingView passage={passage} />
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold">Metni Gemini düzenlesin</h2>
      <p className="mt-1 text-sm text-slate-500">
        Fransızca parçayı yapıştır. Fiil, bağlaç, gönderim ve dört soru otomatik kurulur.
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={7}
        placeholder="Fransızca metin"
        className="mt-3 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
      />
      <button
        onClick={formatText}
        disabled={busy || text.trim().length < 80}
        className="mt-3 h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Düzenleniyor..." : "Formata çevir"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
