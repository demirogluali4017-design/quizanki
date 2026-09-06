"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Flashcard } from "@/types";

export default function WordsPage() {
  const [words, setWords] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchWords() {
      setLoading(true);
      const { data, error } = await supabase
        .from("flashcards")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setWords(data as Flashcard[]);
      }
      setLoading(false);
    }
    fetchWords();
  }, []);

  const filteredWords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return words;
    return words.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q) ||
        (w.preposition ?? "").toLowerCase().includes(q)
    );
  }, [words, search]);

  async function handleDelete(id: string) {
    if (!confirm("Bu kelimeyi silmek istediğine emin misin?")) return;
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (!error) {
      setWords((prev) => prev.filter((w) => w.id !== id));
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">📋 Tüm Kelimeler</h1>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            ← Ana sayfaya dön
          </Link>
        </div>

        <input
          type="text"
          placeholder="Kelime, anlam veya preposition ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Kelime</th>
                <th className="px-4 py-3 font-medium">Preposition</th>
                <th className="px-4 py-3 font-medium">Anlam</th>
                <th className="px-4 py-3 font-medium">Örnek Cümle</th>
                <th className="px-4 py-3 font-medium">Sonraki Tekrar</th>
                <th className="px-4 py-3 font-medium">Tekrar Sayısı</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filteredWords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Kelime bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredWords.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{w.word}</td>
                    <td className="px-4 py-3 text-slate-500">{w.preposition ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{w.meaning}</td>
                    <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">
                      {w.example_sentence}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(w.next_review_date).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{w.repetitions}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          Toplam {filteredWords.length} kelime gösteriliyor.
        </p>
      </div>
    </main>
  );
}
