"use client";

import { useMemo, useState } from "react";
import { OcrToken } from "@/lib/ocr";

export interface OcrDraft {
  id: string;
  word: string;
  meaning: string;
  preposition: string;
}

interface PageView {
  url: string;
  label: string;
  tokens: OcrToken[];
  width: number;
  height: number;
}

export default function OcrWordPicker({
  pages,
  onClose,
}: {
  pages: PageView[];
  onClose: () => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pending, setPending] = useState<OcrToken | null>(null);
  const [drafts, setDrafts] = useState<OcrDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const page = pages[pageIndex];
  const usedTexts = useMemo(() => new Set(drafts.map((draft) => `${draft.word}→${draft.meaning}`)), [drafts]);

  function tap(token: OcrToken) {
    setSavedCount(null);
    setError(null);
    if (pending?.id === token.id) {
      setPending(null);
      return;
    }
    if (!pending) {
      setPending(token);
      return;
    }
    setDrafts((current) => [
      {
        id: `${pending.id}:${token.id}:${current.length}`,
        word: pending.text,
        meaning: token.text,
        preposition: "",
      },
      ...current,
    ]);
    setPending(null);
  }

  function updateDraft(id: string, patch: Partial<OcrDraft>) {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  async function saveAll() {
    const ready = drafts.filter((draft) => draft.word.trim() && draft.meaning.trim());
    if (ready.length === 0) return;
    setSaving(true);
    setError(null);
    let saved = 0;
    try {
      for (const draft of ready) {
        const res = await fetch("/api/add-word", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word: draft.word.trim(),
            preposition: draft.preposition.trim(),
            meaning: draft.meaning.trim(),
            example_sentence: "",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Kelime kaydedilemedi.");
        }
        saved += 1;
      }
      setSavedCount(saved);
      setDrafts([]);
    } catch (err) {
      setSavedCount(saved > 0 ? saved : null);
      setError(err instanceof Error ? err.message : "Beklenmeyen hata.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {pending
            ? `Kelime: ${pending.text}. Şimdi Türkçe anlama dokun.`
            : "Önce Fransızca kelimeye, sonra anlamına dokun."}
        </p>
        <button type="button" onClick={onClose} className="text-sm text-indigo-600 hover:underline">
          Seçimi kapat
        </button>
      </div>

      {pages.length > 1 && (
        <div className="flex gap-2">
          {pages.map((item, index) => (
            <button
              key={item.url}
              type="button"
              onClick={() => setPageIndex(index)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                index === pageIndex
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.url} alt={page.label} className="block h-auto w-full" />
          {page.tokens.map((token) => {
            const active = pending?.id === token.id;
            return (
              <button
                key={token.id}
                type="button"
                onClick={() => tap(token)}
                title={token.text}
                className={`absolute border text-[0px] ${
                  active
                    ? "border-indigo-600 bg-indigo-500/35"
                    : "border-transparent bg-indigo-400/10 hover:border-indigo-500 hover:bg-indigo-400/25"
                }`}
                style={{
                  left: `${(token.bbox.x0 / page.width) * 100}%`,
                  top: `${(token.bbox.y0 / page.height) * 100}%`,
                  width: `${((token.bbox.x1 - token.bbox.x0) / page.width) * 100}%`,
                  height: `${((token.bbox.y1 - token.bbox.y0) / page.height) * 100}%`,
                }}
              />
            );
          })}
        </div>
      </div>

      {page.tokens.length === 0 ? (
        <p className="text-sm text-slate-500">Bu sayfada okunabilir kelime bulunamadı.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {page.tokens.map((token) => {
            const active = pending?.id === token.id;
            return (
              <button
                key={`${token.id}-chip`}
                type="button"
                onClick={() => tap(token)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  active
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {token.text}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Seçilen kartlar ({drafts.length})
          </h2>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving || drafts.length === 0}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Kaydediliyor..." : "Seçilenleri ekle"}
          </button>
        </div>

        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <input
              value={draft.word}
              onChange={(event) => updateDraft(draft.id, { word: event.target.value })}
              aria-label="Kelime"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              value={draft.preposition}
              onChange={(event) => updateDraft(draft.id, { preposition: event.target.value })}
              placeholder="Edat"
              aria-label="Edat"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              value={draft.meaning}
              onChange={(event) => updateDraft(draft.id, { meaning: event.target.value })}
              aria-label="Anlam"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={() => setDrafts((current) => current.filter((item) => item.id !== draft.id))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:border-red-300 hover:text-red-600 dark:border-slate-700"
            >
              Sil
            </button>
          </div>
        ))}

        {usedTexts.size === 0 && drafts.length === 0 && (
          <p className="text-sm text-slate-400">Henüz kart yok.</p>
        )}
      </div>

      {savedCount !== null && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950">
          ✅ {savedCount} kelime kaydedildi.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950">
          ⚠️ {error}
          {savedCount ? ` ${savedCount} kelime bundan önce kaydedildi.` : ""}
        </div>
      )}
    </div>
  );
}
