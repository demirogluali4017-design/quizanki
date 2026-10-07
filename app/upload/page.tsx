"use client";

import { useState } from "react";
import Link from "next/link";
import MultiFileUploadZone from "@/components/MultiFileUploadZone";
import { compressImages } from "@/lib/imageCompression";
import { Flashcard } from "@/types";
import { invalidateCardCache } from "@/lib/cardCache";
import { DRAFT_REVIEW, draftBlockReason } from "@/lib/draftReview";

type ProcessState = "idle" | "processing" | "review" | "saving" | "success" | "error";
type Tab = "photo" | "book" | "press" | "trial" | "manual";

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
            mode={tab === "book" ? "textbook" : tab === "press" ? "press" : tab === "trial" ? "trial" : "list"}
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

// ============================================================
// SEKME 1: Fotoğraf(lar)ı yükle → Gemini ile çıkar (azami 3 sayfa)
// ============================================================
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

function PhotoUploadPanel({ mode }: { mode: "list" | "textbook" | "press" | "trial" }) {
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
      <MultiFileUploadZone
        onFilesChanged={(files) => {
          setSelectedFiles(files);
          setState("idle");
          setSavedWords([]);
          setDrafts([]);
          setTrialRows(null);
          setTrialError(null);
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

      {selectedFiles.length > 0 && mode !== "trial" && state !== "success" && state !== "review" && state !== "saving" && (
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
            ) : (
              `${selectedFiles.length} Sayfayı İşle ve Kelimeleri Çıkar`
            )}
          </button>
          <p className="text-xs text-slate-400">
            {mode === "textbook"
              ? "Yalnızca kalın yazılan kelimeler alınır. Anlam Türkçe, örnek cümle kitaptaki cümledir."
              : mode === "press"
                ? "Yalnızca sarı boyalı kelimeler alınır. Anlam Türkçe, örnek cümle gazetedeki cümledir."
                : "Gemini sayfadaki kelimeleri çıkarır."}
          </p>
        </div>
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
                      placeholder="Preposition"
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
            disabled={state === "saving"}
            className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {state === "saving" ? "Kaydediliyor..." : "Seçilenleri kaydet"}
          </button>
        </div>
      )}

      {state === "success" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 text-green-700 p-4 text-sm flex items-center justify-between">
            <span>✅ {savedWords.length} kelime başarıyla kaydedildi.</span>
            <button onClick={handleReset} className="text-green-800 font-medium hover:underline">
              Yeni sayfa yükle
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Kelime</th>
                  <th className="px-4 py-3 font-medium">Preposition</th>
                  <th className="px-4 py-3 font-medium">Anlam</th>
                  <th className="px-4 py-3 font-medium">Örnek Cümle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {savedWords.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{w.word}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{w.preposition ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{w.meaning}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 italic">{w.example_sentence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SEKME 2: Manuel ekleme (yapay zeka yok, doğrudan form)
// ============================================================
function ManualAddPanel() {
  const [word, setWord] = useState("");
  const [preposition, setPreposition] = useState("");
  const [meaning, setMeaning] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [state, setState] = useState<ProcessState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  function resetForm() {
    setWord("");
    setPreposition("");
    setMeaning("");
    setExampleSentence("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) return;

    setState("processing");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/add-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          preposition,
          meaning,
          example_sentence: exampleSentence,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Bilinmeyen bir hata oluştu.");
      }

      setAddedCount((c) => c + 1);
      invalidateCardCache();
      setState("success");
      resetForm();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Beklenmeyen hata.");
      setState("error");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
        <Field label="Kelime *" value={word} onChange={setWord} placeholder="ör. améliorer" required />
        <Field
          label="Preposition (edat)"
          value={preposition}
          onChange={setPreposition}
          placeholder="ör. à qn/qch (varsa)"
        />
        <Field label="Anlam (Türkçe) *" value={meaning} onChange={setMeaning} placeholder="ör. geliştirmek" required />
        <Field
          label="Örnek Cümle (Fransızca)"
          value={exampleSentence}
          onChange={setExampleSentence}
          placeholder="ör. Il faut améliorer ce projet."
          textarea
        />

        <button
          type="submit"
          disabled={state === "processing" || !word.trim() || !meaning.trim()}
          className="w-full rounded-xl bg-indigo-600 text-white font-medium py-3 hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {state === "processing" ? "Ekleniyor..." : "Kelimeyi Ekle"}
        </button>
      </form>

      {state === "success" && (
        <div className="rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 text-green-700 p-4 text-sm">
          ✅ Kelime eklendi. Bu oturumda toplam {addedCount} kelime ekledin — devam edebilirsin.
        </div>
      )}

      {state === "error" && errorMessage && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 text-red-700 p-4 text-sm">
          ⚠️ {errorMessage}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      )}
    </div>
  );
}
