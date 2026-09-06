"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Flashcard } from "@/types";
import {
  deriveLearningStage,
  deriveCardStatus,
  LEARNING_STAGE_LABELS,
  CARD_STATUS_LABELS,
} from "@/lib/studyEngine";

type FilterTab = "all" | "weak" | "long_term" | "new";

export default function WordsPage() {
  const [words, setWords] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");

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
    let list = words;

    if (filter === "weak") {
      list = list.filter((w) => w.is_weak);
    } else if (filter === "long_term") {
      list = list.filter((w) => deriveLearningStage(w) === "long_term");
    } else if (filter === "new") {
      list = list.filter((w) => deriveLearningStage(w) === "new");
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q) ||
        (w.preposition ?? "").toLowerCase().includes(q)
    );
  }, [words, search, filter]);

  const weakCount = useMemo(() => words.filter((w) => w.is_weak).length, [words]);

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

        <div className="flex flex-wrap gap-2">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            Tümü ({words.length})
          </FilterButton>
          <FilterButton active={filter === "weak"} onClick={() => setFilter("weak")}>
            🟠 Zayıf ({weakCount})
          </FilterButton>
          <FilterButton active={filter === "new"} onClick={() => setFilter("new")}>
            Yeni
          </FilterButton>
          <FilterButton active={filter === "long_term"} onClick={() => setFilter("long_term")}>
            🧠 Uzun Süreli Hafıza
          </FilterButton>
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
                <th className="px-4 py-3 font-medium">Aşama</th>
                <th className="px-4 py-3 font-medium">Durum</th>
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
                filteredWords.map((w) => {
                  const stage = deriveLearningStage(w);
                  const status = deriveCardStatus(w);
                  return (
                    <tr key={w.id}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{w.word}</td>
                      <td className="px-4 py-3 text-slate-500">{w.preposition || "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{w.meaning}</td>
                      <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">
                        {w.example_sentence}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {LEARNING_STAGE_LABELS[stage]}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            status === "weak"
                              ? "bg-orange-100 text-orange-700"
                              : status === "overdue"
                                ? "bg-red-100 text-red-700"
                                : status === "due"
                                  ? "bg-amber-100 text-amber-700"
                                  : status === "strong"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {CARD_STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(w.id)}
                          className="text-red-500 hover:underline text-xs"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })
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

function FilterButton({
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
      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
      }`}
    >
      {children}
    </button>
  );
}
