"use client";

import { useState } from "react";
import Link from "next/link";
import MultiFileUploadZone from "@/components/MultiFileUploadZone";
import { compressImages } from "@/lib/imageCompression";
import { Flashcard } from "@/types";
import { invalidateCardCache } from "@/lib/cardCache";
import { DRAFT_REVIEW, draftBlockReason } from "@/lib/draftReview";
import { recognizeWithTransformers, extractCandidatesFromOcr as extractFromTransformers } from "@/lib/transformersOcr";
import { recognizeWithPaddle, recognizeWithPaddleBoxes, extractCandidatesFromOcr as extractFromPaddle, type OcrBox } from "@/lib/paddleOcr";

type ProcessState = "idle" | "processing" | "review" | "saving" | "success" | "error";
type Tab = "photo" | "book" | "press" | "kitap1" | "transformers" | "paddle" | "trial" | "manual";

export default function UploadPage() {
  const [tab, setTab] = useState<Tab>("photo");

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">⬆️ Kart Yükle</h1>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            ← Ana sayfaya dön
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "photo"} onClick={() => setTab("photo")}>
            📷 Fotoğraf Yükle
          </TabButton>
          <TabButton active={tab === "book"} onClick={() => setTab("book")}>
            📖 Kitap sayfası
          </TabButton>
          <TabButton active={tab === "press"} onClick={() => setTab("press")}>
            📰 Sarı kelimeler
          </TabButton>
          <TabButton active={tab === "kitap1"} onClick={() => setTab("kitap1")}>
            📕 Kitap1 (Ders notu)
          </TabButton>
          <TabButton active={tab === "transformers"} onClick={() => setTab("transformers")}>
            🧠 Transformers (yerel)
          </TabButton>
          <TabButton active={tab === "paddle"} onClick={() => setTab("paddle")}>
            🛶 PaddleOCR (yerel)
          </TabButton>
          <TabButton active={tab === "trial"} onClick={() => setTab("trial")}>
            Deneme tablo
          </TabButton>
          <TabButton active={tab === "manual"} onClick={() => setTab("manual")}>
            ✍️ Manuel Ekle
          </TabButton>
        </div>

        {tab === "manual" ? (
          <ManualAddPanel />
        ) : (
          <PhotoUploadPanel
            mode={
              tab === "book"
                ? "textbook"
                : tab === "press"
                  ? "press"
                  : tab === "kitap1"
                    ? "kitap1"
                    : tab === "transformers"
                      ? "transformers"
                      : tab === "paddle"
                        ? "paddle"
                        : tab === "trial"
                        ? "trial"
                        : "list"
            }
          />
        )}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
      }`}
    >
      {children}
    </button>
  );
}

async function readJson(res: Response) {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(res.status === 413 ? "Fotoğraf sunucu sınırını aştı. Tek sayfa çek." : "Sunucu sayfayı işleyemedi. Fotoğrafı yeniden çekip tekrar dene.");
  }
}

function humanUploadError(err: unknown) {
  const message = err instanceof Error ? err.message : "Beklenmeyen hata.";
  if (/expected pattern/i.test(message)) {
    return "Fotoğraf işlenemedi. Sayfayı yeniden çekip tekrar dene.";
  }
  return message;
}

function PhotoUploadPanel({ mode }: { mode: "list" | "textbook" | "press" | "kitap1" | "transformers" | "paddle" | "trial" }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Flashcard[]>([]);
  const [drafts, setDrafts] = useState<
    { key: string; word: string; preposition: string; meaning: string; example_sentence: string; keep: boolean }[]
  >([]);
  const [trialRows, setTrialRows] = useState<
    { word: string; preposition: string; meaning: string; example_sentence: string }[] | null
  >(null);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [trialBusy, setTrialBusy] = useState(false);
  const [ocrRaw, setOcrRaw] = useState<string | null>(null);
  const [paddleBoxes, setPaddleBoxes] = useState<OcrBox[]>([]);
  const [selectedBoxIds, setSelectedBoxIds] = useState<Set<number>>(new Set());
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  async function handleTransformers() {
    if (selectedFiles.length === 0) return;
    setState("processing");
    setErrorMessage(null);
    setOcrRaw(null);
    try {
      const file = selectedFiles[0];
      const text = await recognizeWithTransformers(file);
      setOcrRaw(text || "(model boş metin döndü)");
      const candidates = extractFromTransformers(text);
      if (candidates.length === 0) {
        setErrorMessage("Model şeritlerden kelime çıkaramadı. Ham metne bak veya fotoğrafı daha yakından çek.");
        setState("error");
        return;
      }
      setDrafts(
        candidates.map((c, i) => ({
          key: `${i}-${c.word}`,
          word: c.word,
          preposition: c.preposition,
          meaning: c.meaning,
          example_sentence: c.example_sentence,
          keep: true,
        }))
      );
      setState("review");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Transformers hatası");
      setState("error");
    }
  }

  async function handlePaddle() {
    if (selectedFiles.length === 0) return;
    setState("processing");
    setErrorMessage(null);
    setOcrRaw(null);
    setPaddleBoxes([]);
    setSelectedBoxIds(new Set());
    try {
      const file = selectedFiles[0];
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      const boxes = await recognizeWithPaddleBoxes(file);
      setPaddleBoxes(boxes);
      setOcrRaw(boxes.map((b) => b.text).join("\n") || "(model boş metin döndü)");
      if (boxes.length === 0) {
        setErrorMessage("PaddleOCR kelime çıkaramadı. Ham metne bak veya fotoğrafı daha net çek.");
        setState("error");
        return;
      }
      setState("review");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "PaddleOCR hatası");
      setState("error");
    }
  }

  function toggleBox(index: number) {
    setSelectedBoxIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function applySelectedBoxes() {
    const selected = paddleBoxes.filter((_, i) => selectedBoxIds.has(i));
    if (selected.length === 0) {
      setErrorMessage("En az bir kelime seç.");
      return;
    }
    setDrafts(
      selected.map((b, i) => ({
        key: `${i}-${b.text}`,
        word: b.text,
        preposition: "",
        meaning: "",
        example_sentence: "",
        keep: true,
      }))
    );
  }

  async function handleProcess() {
    if (selectedFiles.length === 0) return;

    setState("processing");
    setErrorMessage(null);

    try {
      const compressedFiles = await compressImages(selectedFiles, { maxDimension: 1400, quality: 0.72, force: true });
      const tooBig = compressedFiles.find((file) => file.size > 3.5 * 1024 * 1024);
      if (tooBig) throw new Error("Fotoğraf hâlâ çok büyük. Sayfayı daha yakından, tek sayfa olarak çek.");

      const formData = new FormData();
      compressedFiles.forEach((file) => formData.append("images", file));
      formData.append("mode", mode);
      if (DRAFT_REVIEW) formData.append("draft", "1");

      const res = await fetch("/api/process-image", {
        method: "POST",
        body: formData,
      });

      const data = await readJson(res);

      if (!res.ok) {
        const message = String(data.error || "");
        const busy =
          res.status === 503 ||
          res.status === 429 ||
          data.retryable === true ||
          /yoğun|kullanılamıyor|unavailable/i.test(message);
        if (busy) {
          setState("idle");
          setErrorMessage(message || "Gemini şu anda yoğun.");
          return;
        }
        throw new Error(message || "Bilinmeyen bir hata oluştu.");
      }

      if (data.draft) {
        const rows = (data.words ?? []) as {
          word?: string;
          preposition?: string;
          meaning?: string;
          example_sentence?: string;
        }[];
        setDrafts(
          rows.map((row, index) => ({
            key: `${index}-${row.word ?? ""}`,
            word: row.word ?? "",
            preposition: row.preposition ?? "",
            meaning: row.meaning ?? "",
            example_sentence: row.example_sentence ?? "",
            keep: true,
          }))
        );
        setState("review");
        return;
      }

      invalidateCardCache();
      setSavedWords(data.words ?? []);
      setState("success");
    } catch (err) {
      setErrorMessage(humanUploadError(err));
      setState("error");
    }
  }

  async function handleTrial() {
    const file = selectedFiles[0];
    if (!file || trialBusy) return;
    setTrialBusy(true);
    setTrialError(null);
    setTrialRows(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/book-table", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tablo modeli yanıt vermedi.");
      setTrialRows(data.words ?? []);
    } catch (err) {
      setTrialError(err instanceof Error ? err.message : "Deneme başarısız.");
    } finally {
      setTrialBusy(false);
    }
  }

  function handleReset() {
    setSelectedFiles([]);
    setSavedWords([]);
    setDrafts([]);
    setState("idle");
    setErrorMessage(null);
    setOcrRaw(null);
  }

  function updateDraft(key: string, field: "word" | "preposition" | "meaning" | "example_sentence", value: string) {
    setDrafts((rows) => rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  async function handleSaveDrafts() {
    const words = drafts
      .filter((row) => row.keep && !draftBlockReason(row))
      .map((row) => ({
        word: row.word,
        preposition: row.preposition,
        meaning: row.meaning,
        example_sentence: row.example_sentence,
      }));
    if (words.length === 0) {
      setErrorMessage("Kaydedilecek sağlam satır yok.");
      return;
    }

    setState("saving");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/add-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kaydedilemedi.");
      invalidateCardCache();
      setSavedWords(data.words ?? []);
      setDrafts([]);
      setState("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Beklenmeyen hata.");
      setState("review");
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-300">Fotoğraf yükleme paneli geçici olarak basitleştirildi. Manuel ekleme paneli çalışıyor. Full restore coming.</p>
      <MultiFileUploadZone onFilesChanged={(files) => setSelectedFiles(files)} />
    </div>
  );
}

function ManualAddPanel() {
  type Row = {
    key: string;
    word: string;
    preposition: string;
    meaning: string;
    example_sentence: string;
  };

  const emptyRow = (): Row => ({
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    word: "",
    preposition: "",
    meaning: "",
    example_sentence: "",
  });

  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [state, setState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  function updateRow(key: string, field: keyof Omit<Row, "key">, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  function handleReset() {
    setRows([emptyRow()]);
    setState("idle");
    setErrorMessage(null);
    setSavedCount(0);
  }

  async function handleSave() {
    const words = rows
      .map((r) => ({
        word: r.word.trim(),
        preposition: r.preposition.trim(),
        meaning: r.meaning.trim(),
        example_sentence: r.example_sentence.trim(),
      }))
      .filter((r) => !draftBlockReason(r));

    if (words.length === 0) {
      setErrorMessage("Kaydedilecek sağlam satır yok. Kelime ve anlam zorunlu; kelime Türkçe karakter içermemeli.");
      setState("error");
      return;
    }

    setState("saving");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/add-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || "Kaydedilemedi.");
      invalidateCardCache();
      setSavedCount((data.words ?? words).length);
      setState("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Beklenmeyen hata.");
      setState("error");
    }
  }

  const validCount = rows.filter((r) => !draftBlockReason({ word: r.word, meaning: r.meaning })).length;

  if (state === "success") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 text-sm">
          ✅ {savedCount} kelime başarıyla eklendi.
        </div>
        <button onClick={handleReset} className="text-sm text-indigo-600 hover:underline">
          Yeni kelime ekle
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Fransızca kelime, isteğe bağlı edat, Türkçe anlam ve örnek cümle gir. Birden fazla satır ekleyebilirsin.
      </p>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const block = draftBlockReason({ word: row.word, meaning: row.meaning });
          return (
            <div
              key={row.key}
              className={`rounded-xl border p-4 space-y-3 ${
                block && (row.word.trim() || row.meaning.trim())
                  ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  #{index + 1}
                </span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Sil
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={row.word}
                  onChange={(e) => updateRow(row.key, "word", e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Fransızca kelime *"
                />
                <input
                  value={row.preposition}
                  onChange={(e) => updateRow(row.key, "preposition", e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Edat (isteğe bağlı)"
                />
                <input
                  value={row.meaning}
                  onChange={(e) => updateRow(row.key, "meaning", e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:col-span-2"
                  placeholder="Türkçe anlam *"
                />
                <textarea
                  value={row.example_sentence}
                  onChange={(e) => updateRow(row.key, "example_sentence", e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:col-span-2"
                  placeholder="Örnek cümle (isteğe bağlı)"
                  rows={2}
                />
              </div>
              {block && (row.word.trim() || row.meaning.trim()) && (
                <p className="text-xs text-amber-700 dark:text-amber-400">{block}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-indigo-300"
        >
          + Satır ekle
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-3 text-sm">
          {errorMessage}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={state === "saving" || validCount === 0}
        className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "saving"
          ? "Kaydediliyor..."
          : validCount > 0
            ? `${validCount} kelimeyi kaydet`
            : "Kelime ve anlam gir"}
      </button>
    </div>
  );
}
