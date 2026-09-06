"use client";

import { useState } from "react";
import Link from "next/link";
import FileUploadZone from "@/components/FileUploadZone";
import { Flashcard } from "@/types";

type ProcessState = "idle" | "processing" | "success" | "error";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Flashcard[]>([]);

  async function handleProcess() {
    if (!selectedFile) return;

    setState("processing");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch("/api/process-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Bilinmeyen bir hata oluştu.");
      }

      setSavedWords(data.words ?? []);
      setState("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Beklenmeyen hata.");
      setState("error");
    }
  }

  function handleReset() {
    setSelectedFile(null);
    setSavedWords([]);
    setState("idle");
    setErrorMessage(null);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">⬆️ Kart Yükle</h1>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            ← Ana sayfaya dön
          </Link>
        </div>

        <FileUploadZone
          onFileSelected={(file) => {
            setSelectedFile(file);
            setState("idle");
            setSavedWords([]);
          }}
          disabled={state === "processing"}
        />

        {selectedFile && state !== "success" && (
          <button
            onClick={handleProcess}
            disabled={state === "processing"}
            className="w-full rounded-xl bg-indigo-600 text-white font-medium py-3 hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {state === "processing" ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Gemini görseli analiz ediyor...
              </>
            ) : (
              "Görseli İşle ve Kelimeleri Çıkar"
            )}
          </button>
        )}

        {state === "error" && errorMessage && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-4 text-sm">
            ⚠️ {errorMessage}
          </div>
        )}

        {state === "success" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 p-4 text-sm flex items-center justify-between">
              <span>✅ {savedWords.length} kelime başarıyla kaydedildi.</span>
              <button
                onClick={handleReset}
                className="text-green-800 font-medium hover:underline"
              >
                Yeni sayfa yükle
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Kelime</th>
                    <th className="px-4 py-3 font-medium">Preposition</th>
                    <th className="px-4 py-3 font-medium">Anlam</th>
                    <th className="px-4 py-3 font-medium">Örnek Cümle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savedWords.map((w) => (
                    <tr key={w.id}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{w.word}</td>
                      <td className="px-4 py-3 text-slate-500">{w.preposition ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{w.meaning}</td>
                      <td className="px-4 py-3 text-slate-500 italic">
                        {w.example_sentence}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
