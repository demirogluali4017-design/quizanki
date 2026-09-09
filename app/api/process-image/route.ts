import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

const MAX_PAGES = 3;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const images = formData.getAll("images") as File[];

    if (images.length === 0) {
      return NextResponse.json({ error: "Dosya yüklenmedi" }, { status: 400 });
    }

    if (images.length > MAX_PAGES) {
      return NextResponse.json(
        { error: `En fazla ${MAX_PAGES} sayfa yükleyebilirsiniz` },
        { status: 400 }
      );
    }

    // Gemini API başlat
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const allWords: any[] = [];

    // Her fotoğrafı işle
    for (const file of images) {
      // Dosyayı base64'e çevir
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");

      const prompt = `
Bu görüntüden tüm Fransızca kelimeleri çıkar ve şu JSON formatında döndür:
[
  {
    "word": "kelime",
    "preposition": "edat (varsa, yoksa null)",
    "meaning": "Türkçe anlamı",
    "example_sentence": "Fransızca örnek cümle"
  }
]

Sadece JSON array döndür, başka açıklama ekleme.
`.trim();

      // ✅ BURADA inlineData objesi kullanılıyor
      const result = await model.generateContent([
        {
          inlineData: {
            data: base64,                    // base64 string (prefix olmadan)
            mimeType: file.type || "image/jpeg",  // MIME type
          },
        },
        prompt,
      ]);

      const response = await result.response;
      const text = response.text();

      // JSON'u metin içinden çıkar
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const words = JSON.parse(jsonMatch[0]);
        allWords.push(...words);
      }
    }

    // Supabase'e kaydet
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    const insertData = allWords.map((w) => ({
      word: w.word?.trim() || "",
      preposition: w.preposition?.trim() || null,
      meaning: w.meaning?.trim() || "",
      example_sentence: w.example_sentence?.trim() || "",
      next_review: now,
      easiness_factor: 2.5,
      interval: 0,
      repetitions: 0,
    }));

    const { data, error } = await supabase
      .from("flashcards")
      .insert(insertData)
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ words: data });

  } catch (error: any) {
    console.error("Process image error:", error);
    return NextResponse.json(
      { error: error.message || "Görüntü işlenirken hata oluştu" },
      { status: 500 }
    );
  }
}
