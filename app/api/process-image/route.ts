Şimdi app/api/process-image/route.ts dosyasını da görmem gerekiyor. Ancak koddan şunu anlıyorum:

Hata büyük ihtimalle API route'da oluyor. Çünkü:

✅ Upload sayfası doğru FormData gönderiyor

✅ Çoklu dosya desteği var (images field name ile)

❌ API route'da Gemini'ye gönderirken string formatı yanlış olabilir




Geçici Çözüm: API Route Dosyasını Oluştur/Düzelt

app/api/process-image/route.ts dosyasını şöyle oluşturun:

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

    // Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const allWords: any[] = [];

    // Her sayfayı işle
    for (const file of images) {
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

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64,
            mimeType: file.type || "image/jpeg",
          },
        },
        prompt,
      ]);

      const response = await result.response;
      const text = response.text();

      // JSON'u çıkar
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
      console.error("Supabase error:", error);
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




Kritik Nokta: Gemini API Format

Eski (Yanlış) - String hatası verir:
const result = await model.generateContent([base64, prompt]); // ❌

Yeni (Doğru) - inlineData objesi:
const result = await model.generateContent([
  {
    inlineData: {
      data: base64,          // ✅ Prefix olmadan
      mimeType: file.type,   // ✅ MIME type
    },
  },
  prompt,
]);




Diğer Kontroller:

1. .env.local dosyasını kontrol edin:
GEMINI_API_KEY=AIzaSy...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

2. lib/supabase.ts dosyasını kontrol edin:
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}




Test:

Dosyaları kaydedin

npm run dev ile sunucuyu yeniden başlatın

Bir fotoğraf yükleyin

Console'da hata varsa tam mesajı paylaşın

Bu çözüm işe yaramazsa, mevcut app/api/process-image/route.ts dosyanızı paylaşın! 🚀
