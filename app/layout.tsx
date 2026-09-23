import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeProvider";
import FloatingControls from "@/components/FloatingControls";

const sans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flashcard | Anki Klonu",
  description: "Fotoğraftan kelime çıkaran, SM-2 aralıklı tekrar destekli flashcard uygulaması",
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('quizanki:theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${sans.className} bg-slate-50 dark:bg-slate-950 transition-colors`}>
        <ThemeProvider>
          <FloatingControls />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
