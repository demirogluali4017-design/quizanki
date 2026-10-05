import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-12">
      <p className="text-sm font-semibold text-indigo-600">Quizanki</p>
      <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
        Fransızca kelimeleri gerçekten hatırla.
      </h1>
      <p className="mt-3 text-base text-slate-500 dark:text-slate-400">
        Gazetedeki bilmediğin kelime bugünün kartı olur. Unuttuğun kelime yarın geri gelir.
      </p>

      <ul className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <li>Fotoğraftan kelime alırsın.</li>
        <li>Her gün yalnız o günkü paketi çalışırsın.</li>
        <li>Unuttum, zorlandım, hatırladım ya da çok kolaydı dersin.</li>
      </ul>

      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-slate-500">Yükleniyor…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
