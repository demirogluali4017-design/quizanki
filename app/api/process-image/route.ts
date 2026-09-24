import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { createServiceRoleClient } from "@/lib/supabase";
import { ExtractedWord } from "@/types";
export const runtime = "nodejs";
export const maxDuration = 60;
const EXTRACTION_PROMPT = `Bu görsel(ler)deki Fransızca kelimeleri çıkar. Birden fazla görsel verildiyse HEPSİNİ işle ve TEK bir birleşik JSON array olarak döndür (görseller ayrı sayfalar olabilir, sırayla işle). Kurallara KESİNLİKLE uy:
1. "preposition" alanı: Kelimenin (özellikle fiillerin) görselde geçen TÜM edat kalıplarını EKSİKSİZ ve BİREBİR yaz.
   - Görselde "qch" (quelque chose) veya "qn" (quelqu'un) gibi kısaltmalar varsa bunları da kalıba dahil et, çıkarma. Örnek: "penser à qn/qch" görüldüyse preposition alanına tam olarak "à qn/qch" yaz, sadece "à" yazma.
   - Bir fiilin birden fazla edat kalıbı varsa (örn. "parler de qch à qn") HEPSİNİ kaçırmadan yaz, virgülle ayırarak listele. Örnek: "de qch, à qn".
   - Kelimenin yanında edat geçiyorsa bu alanı ASLA boş bırakma ve ASLA kısaltma; edat yoksa boş string ("") bırak.
2. "meaning" alanı: Eğer görselde kelimenin Türkçe anlamı zaten YAZILI olarak veriliyorsa (defter/kitap sayfasında karşısında yazan Türkçe kelime/ifade), onu BİREBİR, HİÇBİR ŞEKİLDE DEĞİŞTİRMEDEN, PARAFRAZ YAPMADAN, EŞ ANLAMLISINI KULLANMADAN aynen yaz — kendi yorumunu veya alternatif çevirini KATMA. Görselde yazılı bir anlam YOKSA (sadece kelimenin kendisi varsa) o zaman doğru ve yaygın Türkçe anlamını sen üret.
3. "example_sentence" alanı: SADECE ve KESİNLİKLE Fransızca bir örnek cümle yaz. İngilizce veya başka bir dilde örnek cümle YAZMA. Görselde kelimeyle birlikte bir örnek cümle varsa onu birebir kullan; yoksa kelimeye uygun basit, doğru dilbilgisiyle yazılmış yeni bir Fransızca cümle üret.
4. Aynı kelime birden fazla görselde tekrar geçiyorsa SADECE BİR KEZ ekle (tekrar eden kaydı çıkarma).
Yanıtı sadece ve strictly JSON array formatında döndür, başka hiçbir açıklama ekleme.
Format:
[{"word": "", "preposition": "", "meaning": "", "example_sentence": ""}]`;
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
function collectApiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY);
  }
  let i = 2;
  while (process.env[`GEMINI_API_KEY_${i}`]) {
    keys.push(process.env[`GEMINI_API_KEY_${i}`] as string);
    i++;
  }
  return keys;
}
function isRetryableError(err: unknown): boolean {
  const error = err as {
    message?: string;
    status?: number | string;
    code?: number | string;
  };
  const message = String(error?.message ?? err ?? "").toUpperCase();
  const status = String(error?.status ?? error?.code ?? "");
  return (
    status === "429" ||
    status === "500" ||
    status === "503" ||
    message.includes("429") ||
    message.includes("500") ||
    message.includes("503") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("UNAVAILABLE") ||
    message.includes("SERVICE_UNAVAILABLE")
  );
}

const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
const CALL_TIMEOUT_MS = 24000;

async function callModel(
  apiKey: string,
  model: string,
  contents: unknown,
  withThinking: boolean
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const generationConfig: Record<string, unknown> = {
      temperature: 0.2,
      responseMimeType: "application/json",
    };
    if (withThinking) generationConfig.thinkingConfig = { thinkingLevel: "minimal" };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({ contents, generationConfig }),
        signal: controller.signal,
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    if (!res.ok) {
      const error = new Error(data.error?.message || `Gemini ${res.status}`);
      (error as { status?: number }).status = res.status;
      throw error;
    }
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
    if (!text.trim()) throw new Error("Gemini boş yanıt döndürdü.");
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      const timeout = new Error("Gemini zaman aşımı");
      (timeout as { status?: number }).status = 503;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function extractText(apiKeys: string[], contents: unknown): Promise<string> {
  let lastError: unknown = null;
  for (const apiKey of apiKeys) {
    for (const model of MODELS) {
      try {
        console.log(`Gemini ${model} deneniyor`);
        return await callModel(apiKey, model, contents, true);
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : "";
        const status = (err as { status?: number }).status;
        if (status === 400 && /thinking/i.test(message)) {
          try {
            return await callModel(apiKey, model, contents, false);
          } catch (retryErr) {
            lastError = retryErr;
          }
        }
        console.warn(`Gemini ${model} olmadı:`, message || err);
      }
    }
  }
  throw lastError ?? new Error("Gemini yanıt vermedi.");
}
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const apiKeys = collectApiKeys();
    if (apiKeys.length === 0) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY ortam değişkeni tanımlı değil.",
        },
        { status: 500 }
      );
    }
    const formData = await request.formData();
    const files = formData.getAll("images") as File[];
    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          error:
            "Görsel dosyası bulunamadı ('images' alanı gerekli).",
        },
        { status: 400 }
      );
    }
    const MAX_IMAGES = 3;
    if (files.length > MAX_IMAGES) {
      return NextResponse.json(
        {
          error: `En fazla ${MAX_IMAGES} görsel birden yükleyebilirsin.`,
        },
        { status: 400 }
      );
    }
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error: "Sadece JPG/PNG formatları destekleniyor.",
          },
          { status: 400 }
        );
      }
    }
    const imageParts = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return {
          inlineData: {
            mimeType: file.type,
            data: base64,
          },
        };
      })
    );
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: EXTRACTION_PROMPT,
          },
          ...imageParts,
        ],
      },
    ];
    let rawText: string | undefined;
    let lastError: unknown = null;
    try {
      rawText = await extractText(apiKeys, contents);
    } catch (err) {
      lastError = err;
      console.error("Gemini çıkarma başarısız:", err);
    }
    if (!rawText) {
      if (lastError && isRetryableError(lastError)) {
        return NextResponse.json(
          {
            error:
              "Gemini şu anda yoğun veya geçici olarak kullanılamıyor. Lütfen birkaç saniye sonra tekrar deneyin.",
            retryable: true,
          },
          { status: 503 }
        );
      }
      throw (
        lastError ??
        new Error("Gemini boş yanıt döndürdü.")
      );
    }
    let extractedWords: ExtractedWord[];
    try {
      extractedWords = extractJsonArray(rawText);
    } catch (parseError) {
      console.error(
        "JSON parse hatası:",
        parseError,
        "Ham yanıt:",
        rawText
      );
      return NextResponse.json(
        {
          error:
            "Gemini yanıtı geçerli JSON formatında değil.",
          raw: rawText,
        },
        { status: 502 }
      );
    }
    if (extractedWords.length === 0) {
      return NextResponse.json(
        {
          error:
            "Görselde herhangi bir kelime tespit edilemedi.",
          words: [],
        },
        { status: 200 }
      );
    }
    const rowsToInsert = extractedWords.map((item) => ({
      word: item.word?.trim() ?? "",
      preposition:
        item.preposition?.trim() || null,
      meaning: item.meaning?.trim() ?? "",
      example_sentence:
        item.example_sentence?.trim() ?? "",
      repetitions: 0,
      interval: 1,
      ease_factor: 2.5,
      next_review_date: new Date().toISOString(),
      in_learning_phase: false,
      learning_streak: 0,
    }));
    const supabaseAdmin =
      createServiceRoleClient();
    const {
      data: insertedRows,
      error: insertError,
    } = await supabaseAdmin
      .from("flashcards")
      .insert(rowsToInsert)
      .select();
    if (insertError) {
      console.error(
        "Supabase insert hatası:",
        insertError
      );
      return NextResponse.json(
        {
          error:
            "Kelimeler veritabanına kaydedilemedi.",
          details: insertError.message,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        success: true,
        count: insertedRows?.length ?? 0,
        words: insertedRows,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(
      "process-image genel hata:",
      err
    );
    const message =
      err instanceof Error
        ? err.message
        : "Bilinmeyen hata";
    if (isRetryableError(err)) {
      return NextResponse.json(
        {
          error:
            "Gemini şu anda yoğun veya geçici olarak kullanılamıyor. Lütfen birkaç saniye sonra tekrar deneyin.",
          details: message,
          retryable: true,
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error:
          "İşlem sırasında beklenmeyen bir hata oluştu.",
        details: message,
      },
      { status: 500 }
    );
  }
}
