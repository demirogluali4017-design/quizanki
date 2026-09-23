"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "owner" ? "Bu hesap yetkili değil." : null
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("E-posta veya şifre hatalı.");
      setLoading(false);
      return;
    }

    const next = searchParams.get("next");
    window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">Flashcard</p>
      <h1 className="mt-2 text-3xl text-slate-900 dark:text-slate-50">Giriş</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Kelimeler sadece hesaba giriş yapılınca açılır.
      </p>

      <label className="mt-6 block text-sm text-slate-600 dark:text-slate-300" htmlFor="email">
        E-posta
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
      />

      <label className="mt-4 block text-sm text-slate-600 dark:text-slate-300" htmlFor="password">
        Şifre
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
      />

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 h-11 w-full rounded-full bg-indigo-700 text-sm font-medium text-white transition-colors hover:bg-indigo-800 disabled:opacity-60"
      >
        {loading ? "Giriliyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
