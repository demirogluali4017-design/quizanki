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

/**
 * Ortam değişkenlerinden sırayla Gemini API anahtarlarını toplar.
 * GEMINI_API_KEY zorunludur; GEMINI_API_KEY_2, GEMINI_API_KEY_3 ...
 * şeklinde eklenen ek anahtarlar, birincisi kota (429) veya geçici
 * kullanılamazlık (503) hatası verdiğinde otomatik yedek olarak denenir.
 */
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

/** Hata mesajından Gemini'nin kota/yoğunluk hatası verip vermediğini anlar. */
function isRetryableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("429") ||
    message.includes("503") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("UNAVAILABLE")
  );
}

export async function POST(request: NextRequest) {
  try {
    const apiKeys = collectApiKeys();
    if (apiKeys.length === 0) {
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

    // Anahtarları sırayla dene: biri kota/yoğunluk hatası verirse bir sonrakine geç
    let rawText: string | undefined;
    let lastError: unknown = null;

    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
      const ai = new GoogleGenAI({ apiKey: apiKeys[keyIndex] });

      try {
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

        rawText = response.text;
        lastError = null;
        break; // başarılı oldu, döngüden çık
      } catch (err) {
        lastError = err;
        const hasNextKey = keyIndex < apiKeys.length - 1;

        if (isRetryableError(err) && hasNextKey) {
          console.warn(
            `Gemini anahtarı #${keyIndex + 1} kota/yoğunluk hatası verdi, sıradaki anahtara geçiliyor.`
          );
          continue; // sıradaki anahtarı dene
        }

        // Yeniden denenemeyecek bir hata ya da denenecek anahtar kalmadı
        throw err;
      }
    }

    if (lastError) {
      throw lastError;
    }

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
