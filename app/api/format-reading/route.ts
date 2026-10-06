import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
const CALL_TIMEOUT_MS = 28000;

const PROMPT = `Sana Fransızca bir metin verilecek. Bunu Quizanki okuma formatına çevir.
Metni kısaltabilirsin ama yeni olay uydurma. 180-320 kelime kalsın. YDS parçası gibi akademik ve tarafsız olsun.

İşaretleri metnin içine göm:
- Fiil: [[v:fondent|présent]] zaman Fransızca adıyla (présent, passé composé, imparfait, plus-que-parfait, futur, conditionnel, subjonctif)
- Sıfat: [[a:ancien]]
- Bağlaç ve geçiş: [[c:cependant]]
- Gönderim: [[r:elle]]
İşaretsiz kelimeyi de metinde bırak. Her paragraf ayrı string olsun.

Dört soru ve şıklar Fransızca olsun, YDS okuma kalıbında:
1. idée principale
2. détail explicite
3. vocabulaire en contexte
4. inférence, ce n'est pas une phrase copiée
answer 0-3. why kısa Fransızca gerekçe. kind alanları: Idée principale, Détail, Vocabulaire, Inférence.

summaryTr: parçanın Türkçe özeti, 3-4 cümle.
topic: Çevre, Sağlık, Tarih, Ekonomi veya Eğitim.
title: Fransızca başlık.
minutes: 4.
sourceNote: "Gemini düzenlemesi".

Yanıt yalnızca JSON olsun:
{"topic":"","title":"","minutes":4,"sourceNote":"","paragraphs":[""],"summaryTr":"","questions":[{"kind":"Ana fikir","prompt":"","options":["","","",""],"answer":0,"why":""}]}`;

function collectApiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  let i = 2;
  while (process.env[`GEMINI_API_KEY_${i}`]) {
    keys.push(process.env[`GEMINI_API_KEY_${i}`] as string);
    i += 1;
  }
  return keys;
}

async function callModel(apiKey: string, model: string, text: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${PROMPT}\n\nMETİN:\n${text}` }] }],
          generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    if (!res.ok) throw new Error(data.error?.message || `Gemini ${res.status}`);
    return (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  if (text.length < 80) {
    return NextResponse.json({ error: "Düzenlemek için daha uzun bir Fransızca metin yapıştır." }, { status: 400 });
  }

  const keys = collectApiKeys();
  if (keys.length === 0) {
    return NextResponse.json({ error: "Gemini anahtarı yok." }, { status: 500 });
  }

  let raw = "";
  let lastError = "Gemini yanıt vermedi.";
  for (const key of keys) {
    for (const model of MODELS) {
      try {
        raw = await callModel(key, model, text.slice(0, 8000));
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : lastError;
      }
    }
    if (raw) break;
  }
  if (!raw) return NextResponse.json({ error: lastError }, { status: 502 });

  const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "")) as {
    topic?: string;
    title?: string;
    minutes?: number;
    sourceNote?: string;
    paragraphs?: string[];
    summaryTr?: string;
    questions?: { kind: string; prompt: string; options: string[]; answer: number; why: string }[];
  };
  if (!parsed.paragraphs?.length || !parsed.questions?.length) {
    return NextResponse.json({ error: "Gemini formatı eksik döndürdü." }, { status: 502 });
  }

  return NextResponse.json({
    passage: {
      id: `draft-${Date.now()}`,
      topic: parsed.topic || "Okuma",
      title: parsed.title || "Parça",
      minutes: parsed.minutes || 4,
      sourceNote: parsed.sourceNote || "Gemini düzenlemesi",
      paragraphs: parsed.paragraphs,
      summaryTr: parsed.summaryTr || "",
      questions: parsed.questions.slice(0, 4),
    },
  });
}
