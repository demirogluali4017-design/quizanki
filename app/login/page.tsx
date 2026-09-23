import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16 dark:bg-slate-950">
      <Suspense fallback={<p className="text-sm text-slate-500">Yükleniyor…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
