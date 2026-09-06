import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createServiceRoleClient } from "@/lib/supabase";
import { ExtractedWord } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXTRACTION_PROMPT = `Bu görseldeki İngilizce kelimeleri, varsa bağlı oldukları prepositions (edatlar) ile birlikte çıkar. Türkçe anlamlarını ve görselde geçen veya kelimeye uygun basit bir İngilizce örnek cümleyi analiz et. Yanıtı sadece ve strictly JSON array formatında döndür. Format: [{"word": "", "preposition": "", "meaning": "", "example_sentence": ""}]`;

/**
 * Gemini'nin bazen JSON'u ```json ... ``` gibi code fence içine
 * sarmalamasına karşı temizleme yardımcı fonksiyonu.
 */
function extractJsonArray(rawText: string): ExtractedWord[] {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini yanıtı bir JSON array değil.");
  }

  return parsed as ExtractedWord[];
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY ortam değişkeni tanımlı değil." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Görsel dosyası bulunamadı ('image' alanı gerekli)." },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Sadece JPG/PNG formatları destekleniyor." },
        { status: 400 }
      );
    }

    // Dosyayı base64'e çevir
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // Gemini istemcisini oluştur
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: EXTRACTION_PROMPT },
            {
              inlineData: {
                mimeType: file.type,
                data: base64Image,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const rawText = response.text;

    if (!rawText) {
      return NextResponse.json(
        { error: "Gemini boş yanıt döndürdü." },
        { status: 502 }
      );
    }

    let extractedWords: ExtractedWord[];
    try {
      extractedWords = extractJsonArray(rawText);
    } catch (parseError) {
      console.error("JSON parse hatası:", parseError, "Ham yanıt:", rawText);
      return NextResponse.json(
        { error: "Gemini yanıtı geçerli JSON formatında değil.", raw: rawText },
        { status: 502 }
      );
    }

    if (extractedWords.length === 0) {
      return NextResponse.json(
        { error: "Görselde herhangi bir kelime tespit edilemedi.", words: [] },
        { status: 200 }
      );
    }

    // Supabase'e kaydedilecek satırları hazırla (SM-2 varsayılan değerleriyle)
    const rowsToInsert = extractedWords.map((item) => ({
      word: item.word?.trim() ?? "",
      preposition: item.preposition?.trim() || null,
      meaning: item.meaning?.trim() ?? "",
      example_sentence: item.example_sentence?.trim() ?? "",
      repetitions: 0,
      interval: 1,
      ease_factor: 2.5,
      next_review_date: new Date().toISOString(),
    }));

    const supabaseAdmin = createServiceRoleClient();
    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("flashcards")
      .insert(rowsToInsert)
      .select();

    if (insertError) {
      console.error("Supabase insert hatası:", insertError);
      return NextResponse.json(
        { error: "Kelimeler veritabanına kaydedilemedi.", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, count: insertedRows?.length ?? 0, words: insertedRows },
      { status: 201 }
    );
  } catch (err) {
    console.error("process-image genel hata:", err);
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json(
      { error: "İşlem sırasında beklenmeyen bir hata oluştu.", details: message },
      { status: 500 }
    );
  }
}
