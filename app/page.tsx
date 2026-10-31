import Link from "next/link";

// İlk giriş: iki ayrı kapı. Fransızca = mevcut uygulama (Supabase verisi, değişmedi).
// İngilizce = ayrı YDS paketi (statik veri + ayrı localStorage ilerlemesi).
export default function LanguageChooser() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <h1 className="font-display text-4xl font-semibold">Quizanki</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">Hangi dili çalışmak istiyorsun?</p>
      <div className="mt-8 grid gap-4">
        <Link href="/en" className="rounded-2xl border border-slate-200 p-6 hover:border-indigo-500 dark:border-slate-700">
          <div className="text-2xl font-semibold">🇬🇧 İngilizce</div>
          <div className="mt-1 text-sm text-slate-500">YDS kelime listeleri (Öztürk) — 43 deste</div>
        </Link>
        <Link href="/fr" className="rounded-2xl border border-slate-200 p-6 hover:border-indigo-500 dark:border-slate-700">
          <div className="text-2xl font-semibold">🇫🇷 Fransızca</div>
          <div className="mt-1 text-sm text-slate-500">Kendi kelimelerin, mevcut ilerlemen</div>
        </Link>
      </div>
    </main>
  );
}
