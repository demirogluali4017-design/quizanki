"use client";

import { useCallback, useState } from "react";

interface SpeakButtonProps {
  text: string;
  size?: "sm" | "md";
}

const RATE_KEY = "quizanki:tts:rate";
const PITCH_KEY = "quizanki:tts:pitch";

export function getTTSSettings() {
  if (typeof window === "undefined") return { rate: 0.9, pitch: 1 };
  const rate = parseFloat(localStorage.getItem(RATE_KEY) ?? "0.9");
  const pitch = parseFloat(localStorage.getItem(PITCH_KEY) ?? "1");
  return {
    rate: Number.isFinite(rate) ? rate : 0.9,
    pitch: Number.isFinite(pitch) ? pitch : 1,
  };
}

export function setTTSSettings(rate: number, pitch: number) {
  localStorage.setItem(RATE_KEY, String(rate));
  localStorage.setItem(PITCH_KEY, String(pitch));
}

export default function SpeakButton({ text, size = "md" }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  const handleSpeak = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // kart flip'ini tetiklemesin
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setUnsupported(true);
        return;
      }

      window.speechSynthesis.cancel(); // önceki okumayı durdur

      const { rate, pitch } = getTTSSettings();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [text]
  );

  if (unsupported) return null; // tarayıcı desteklemiyorsa sessizce gizle

  const dimensions = size === "sm" ? "w-10 h-10" : "w-11 h-11";

  return (
    <button
      type="button"
      onClick={handleSpeak}
      className={`${dimensions} flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 ${speaking ? "border-indigo-500 text-indigo-700" : ""}`}
      title="Fransızca telaffuzu dinle"
      aria-label="Fransızca telaffuzu dinle"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 10h3.2L12 6.2v11.6L7.2 14H4v-4z" strokeLinejoin="round" />
        <path d="M16 9.2a3.8 3.8 0 0 1 0 5.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}
