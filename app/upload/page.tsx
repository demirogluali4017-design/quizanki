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
      // Seçim moduna geç
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
      {mode === "trial" && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Fotoğrafı seç, sonra aşağıdaki butona bas. Tablo çıkar, kaydetmez.
        </p>
      )}
      {mode === "kitap1" && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Ders notu fotoğrafı yükle. Gemini tüm önemli sözcükleri, kalıpları ve edatlı yapıları çıkarır.
        </p>
      )}
      {mode === "transformers" && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Yerel Transformers.js (TrOCR şerit). İlk kullanımda model indirilir. Anlam ve örnek cümleyi sen doldurursun.
        </p>
      )}
      {mode === "paddle" && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Yerel PaddleOCR. Fotoğrafı yükle, kelimelerin üzerinde kutular çıkar. İstediğini tıklayarak seç, sonra kaydet.
        </p>
      )}
      <MultiFileUploadZone
        onFilesChanged={(files) => {
          setSelectedFiles(files);
          setState("idle");
          setSavedWords([]);
          setDrafts([]);
          setTrialRows(null);
          setTrialError(null);
          setOcrRaw(null);
        }}
      />

      {mode === "trial" && state !== "success" && (
        <button
          onClick={handleTrial}
          disabled={selectedFiles.length === 0 || trialBusy}
          className="w-full rounded-xl bg-[#0f6b5c] py-3 font-medium text-white disabled:opacity-50"
        >
          {trialBusy ? "Tablo modeli sayfayı okuyor..." : "Tablo modelini çalıştır"}
        </button>
      )}

      {mode === "transformers" && selectedFiles.length > 0 && state !== "success" && state !== "review" && state !== "saving" && (
        <button
          onClick={handleTransformers}
          disabled={state === "processing"}
          className="w-full rounded-xl bg-violet-700 py-3 font-medium text-white disabled:opacity-50"
        >
          {state === "processing" ? "Model şeritleri okuyor..." : "Transformers ile kelime çıkar (yerel)"}
        </button>
      )}

      {mode === "paddle" && selectedFiles.length > 0 && state !== "success" && state !== "review" && state !== "saving" && (
        <button
          onClick={handlePaddle}
          disabled={state === "processing"}
          className="w-full rounded-xl bg-emerald-700 py-3 font-medium text-white disabled:opacity-50"
        >
          {state === "processing" ? "PaddleOCR okuyor..." : "PaddleOCR ile kelime çıkar (yerel)"}
        </button>
      )}

      {mode === "paddle" && imageUrl && paddleBoxes.length > 0 && state === "review" && drafts.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Kutulara tıkla, istediğin kelimeleri seç. Sonra “Seçilenleri al” de.
          </p>
          <div className="relative inline-block max-w-full">
            <img
              src={imageUrl}
              alt="OCR"
              className="max-w-full rounded-lg"
              onLoad={(e) => setImgSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            />
            {imgSize &&
              paddleBoxes.map((box, i) => {
                const selected = selectedBoxIds.has(i);
                const style: React.CSSProperties = {
                  position: "absolute",
                  left: `${(box.bbox.x0 / imgSize.w) * 100}%`,
                  top: `${(box.bbox.y0 / imgSize.h) * 100}%`,
                  width: `${((box.bbox.x1 - box.bbox.x0) / imgSize.w) * 100}%`,
                  height: `${((box.bbox.y1 - box.bbox.y0) / imgSize.h) * 100}%`,
                  border: selected ? "2px solid #10b981" : "1px solid #6366f1",
                  background: selected ? "rgba(16,185,129,0.25)" : "rgba(99,102,241,0.12)",
                  cursor: "pointer",
                };
                return (
                  <div key={i} style={style} onClick={() => toggleBox(i)} title={box.text} />
                );
              })}
          </div>
          <button
            onClick={applySelectedBoxes}
            disabled={selectedBoxIds.size === 0}
            className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-50"
          >
            Seçilenleri al ({selectedBoxIds.size})
          </button>
        </div>
      )}

      {selectedFiles.length > 0 && mode !== "trial" && mode !== "transformers" && mode !== "paddle" && state !== "success" && state !== "review" && state !== "saving" && (
        <div className="space-y-2">
          <button
            onClick={handleProcess}
            disabled={state === "processing"}
            className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "processing" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Gemini {selectedFiles.length} sayfayı analiz ediyor...
              </span>
            ) : mode === "textbook" ? (
              `${selectedFiles.length} kitap sayfasındaki koyu kelimeleri çıkar`
            ) : mode === "press" ? (
              `${selectedFiles.length} sayfadaki sarı kelimeleri çıkar`
            ) : mode === "kitap1" ? (
              `${selectedFiles.length} ders notundaki kelimeleri ve kalıpları çıkar`
            ) : (
              `${selectedFiles.length} Sayfayı İşle ve Kelimeleri Çıkar`
            )}
          </button>
          <p className="text-xs text-slate-400">
            {mode === "textbook"
              ? "Yalnızca kalın yazılan kelimeler alınır. Anlam Türkçe, örnek cümle kitaptaki cümledir."
              : mode === "press"
                ? "Yalnızca sarı boyalı kelimeler alınır. Anlam Türkçe, örnek cümle gazetedeki cümledir."
                : mode === "kitap1"
                  ? "Tüm önemli sözcükler, kalıplar ve edatlı yapılar çıkarılır. İsimler artikelleriyle, örnekler B2 seviyesinde."
                  : "Gemini sayfadaki kelimeleri çıkarır."}
          </p>
        </div>
      )}

      {ocrRaw && (state === "review" || state === "error") && (
        <details open className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900">
          <summary className="cursor-pointer font-medium">Ham OCR metni</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">{ocrRaw}</pre>
        </details>
      )}

      {trialError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950">
          {trialError}
        </div>
      )}

      {trialRows && (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Deneme tablosu. Kaydedilmedi. {trialRows.length} satır.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-500 dark:bg-slate-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Kelime</th>
                  <th className="px-3 py-2 font-medium">Prep</th>
                  <th className="px-3 py-2 font-medium">Anlam</th>
                  <th className="px-3 py-2 font-medium">Örnek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {trialRows.map((row, index) => (
                  <tr key={`${row.word}-${index}`}>
                    <td className="px-3 py-2 font-semibold">{row.word}</td>
                    <td className="px-3 py-2">{row.preposition || "—"}</td>
                    <td className="px-3 py-2">{row.meaning}</td>
                    <td className="px-3 py-2 italic">{row.example_sentence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {state === "error" && errorMessage && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 text-red-700 p-4 text-sm">
          ⚠️ {errorMessage}
        </div>
      )}

      {(state === "review" || state === "saving") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {drafts.filter((row) => row.keep && !draftBlockReason(row)).length} satır kayda hazır. İşaretini kaldırdığın satır girmez.
            </p>
            <button onClick={handleReset} className="text-sm text-slate-500 hover:underline">
              Vazgeç
            </button>
          </div>
          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
          <div className="space-y-3">
            {drafts.map((row) => {
              const reason = draftBlockReason(row);
              return (
                <div
                  key={row.key}
                  className={`rounded-xl border bg-white p-3 dark:bg-slate-800 ${
                    reason ? "border-red-300" : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <label className="mb-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.keep && !reason}
                      disabled={Boolean(reason)}
                      onChange={(event) =>
                        setDrafts((rows) =>
                          rows.map((item) => (item.key === row.key ? { ...item, keep: event.target.checked } : item))
                        )
                      }
                    />
                    {reason ? <span className="text-red-600">{reason}</span> : <span>Kaydet</span>}
                  </label>
                  <div className="grid gap-2">
                    <input
                      value={row.word}
                      onChange={(event) => updateDraft(row.key, "word", event.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                      placeholder="Kelime"
                    />
                    <input
                      value={row.preposition}
                      onChange={(event) => updateDraft(row.key, "preposition", event.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                      placeholder="Dilbilgisi / Edat"
                    />
                    <input
                      value={row.meaning}
                      onChange={(event) => updateDraft(row.key, "meaning", event.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                      placeholder="Anlam"
                    />
                    <textarea
                      value={row.example_sentence}
                      onChange={(event) => updateDraft(row.key, "example_sentence", event.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                      placeholder="Örnek cümle"
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={handleSaveDrafts}
            disabled={state === "saving" || drafts.filter((row) => row.keep && !draftBlockReason(row)).length === 0}
            className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-50"
          >
            {state === "saving" ? "Kaydediliyor..." : "Seçilenleri kaydet"}
          </button>
        </div>
      )}

      {state === "success" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 text-emerald-800 p-4 text-sm">
            ✅ {savedWords.length} kelime kaydedildi.
          </div>
          <button onClick={handleReset} className="text-sm text-indigo-600 hover:underline">
            Başka yükle
          </button>
        </div>
      )}
    </div>
  );
}

function ManualAddPanel() {
  return <div className="text-sm text-slate-500">Manuel ekleme paneli.</div>;
}

