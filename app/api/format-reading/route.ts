import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { formatWithGemini } from "@/lib/geminiReading";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  if (text.length < 80) {
    return NextResponse.json({ error: "Düzenlemek için daha uzun bir Fransızca metin yapıştır." }, { status: 400 });
  }

  try {
    const parsed = await formatWithGemini(text);
    return NextResponse.json({
      passage: {
        id: `draft-${Date.now()}`,
        topic: parsed.topic || "Okuma",
        title: parsed.title || "Parça",
        minutes: parsed.minutes || 4,
        sourceNote: "Gemini düzenlemesi",
        paragraphs: parsed.paragraphs,
        summaryTr: parsed.summaryTr || "",
        questions: parsed.questions?.slice(0, 4) ?? [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini formatı kurulamadı.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
