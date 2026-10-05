import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireUser } from "@/lib/require-user";
import { draftBlockReason } from "@/lib/draftReview";

export const runtime = "nodejs";

/**
 * Manuel (yapay zeka kullanmadan) kelime ekleme endpoint'i.
 * process-image ile aynı güvenlik modelini kullanır: yazma işlemi
 * service_role client üzerinden yapılır, client tarafına hiçbir
 * gizli anahtar sızmaz.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    if (Array.isArray(body.words)) {
      const rows = body.words
        .map((item: { word?: string; preposition?: string; meaning?: string; example_sentence?: string }) => ({
          word: (item.word ?? "").trim(),
          preposition: (item.preposition ?? "").trim() || null,
          meaning: (item.meaning ?? "").trim(),
          example_sentence: (item.example_sentence ?? "").trim(),
        }))
        .filter((item: { word: string; meaning: string }) => !draftBlockReason(item));

      if (rows.length === 0) {
        return NextResponse.json({ error: "Kaydedilecek sağlam satır yok." }, { status: 400 });
      }

      const supabaseAdmin = createServiceRoleClient();
      const { data, error } = await supabaseAdmin
        .from("flashcards")
        .insert(
          rows.map((item: { word: string; preposition: string | null; meaning: string; example_sentence: string }) => ({
            ...item,
            repetitions: 0,
            interval: 1,
            ease_factor: 2.5,
            next_review_date: new Date().toISOString(),
            in_learning_phase: false,
            learning_streak: 0,
          }))
        )
        .select();

      if (error) {
        return NextResponse.json({ error: "Kelimeler kaydedilemedi.", details: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, words: data ?? [] }, { status: 201 });
    }

    const word = (body.word ?? "").trim();
    const preposition = (body.preposition ?? "").trim();
    const meaning = (body.meaning ?? "").trim();
    const example_sentence = (body.example_sentence ?? "").trim();

    if (!word || !meaning) {
      return NextResponse.json(
        { error: "Kelime ve anlam alanları zorunludur." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createServiceRoleClient();
    const { data, error } = await supabaseAdmin
      .from("flashcards")
      .insert({
        word,
        preposition: preposition || null,
        meaning,
        example_sentence: example_sentence || "",
        repetitions: 0,
        interval: 1,
        ease_factor: 2.5,
        next_review_date: new Date().toISOString(),
        in_learning_phase: false,
        learning_streak: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("add-word insert hatası:", error);
      return NextResponse.json(
        { error: "Kelime kaydedilemedi.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, word: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("add-word genel hata:", err);
    return NextResponse.json(
      { error: "İşlem sırasında beklenmeyen bir hata oluştu.", details: message },
      { status: 500 }
    );
  }
}
