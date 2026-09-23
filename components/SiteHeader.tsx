"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/ThemeProvider";

const LINKS = [
  { href: "/", label: "Bugün" },
  { href: "/study", label: "Çalış" },
  { href: "/words", label: "Kelimeler" },
  { href: "/upload", label: "Yükle" },
  { href: "/progress", label: "İlerleme" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-slate-50/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <Link
          href="/"
          className="shrink-0 font-display text-lg tracking-tight text-slate-900 dark:text-slate-50"
        >
          Quizanki
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href="/settings"
            className={`flex h-10 items-center whitespace-nowrap rounded-full border px-3 text-sm transition-colors ${
              pathname.startsWith("/settings")
                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                : "border-slate-200 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
            }`}
          >
            Ayarlar
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 items-center whitespace-nowrap rounded-full border border-slate-200 px-3 text-sm text-slate-600 transition-colors hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
            title="Temayı değiştir"
          >
            {theme === "dark" ? "Aydınlık" : "Koyu"}
          </button>
        </div>
        <nav className="flex w-full flex-nowrap items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
