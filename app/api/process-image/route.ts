import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
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
/**
 * Gemini'nin JSON'u bazen ```json ... ``` şeklinde
 * code fence içine sarmalamasına karşı temizler.
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
 * Ortam değişkenlerinden Gemini API anahtarlarını toplar.
 *
 * GEMINI_API_KEY
 * GEMINI_API_KEY_2
 * GEMINI_API_KEY_3
 * ...
 */
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
/**
 * Gemini hatasının tekrar denenebilir olup olmadığını belirler.
 *
 * 429 = Rate limit / quota
 * 500 = Geçici server hatası
 * 503 = Servis yoğun / unavailable
 */
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
/**
 * Retry bekleme süresi.
 *
 * 1. retry → 1 saniye
 * 2. retry → 2 saniye
 * 3. retry → 4 saniye
 *
 * Küçük bir jitter eklenir; aynı anda gelen isteklerin
 * aynı anda tekrar gönderilmesini azaltır.
 */
function getRetryDelay(attempt: number): number {
  const baseDelay = 1000 * Math.pow(2, attempt);
  // 0-500 ms arası küçük rastgele jitter
  const jitter = Math.floor(Math.random() * 500);
  return baseDelay + jitter;
}
/**
 * Bir Gemini API anahtarını kullanarak isteği gönderir.
 *
 * Aynı key üzerinde maksimum 3 retry:
 *
 * İlk deneme
 * ↓
 * 503
 * ↓ 1-1.5 sn
 * retry
 * ↓
 * 503
 * ↓ 2-2.5 sn
 * retry
 * ↓
 * 503
 * ↓ 4-4.5 sn
 * retry
 *
 * Hâlâ başarısızsa hata dışarı atılır ve üst fonksiyon
 * sıradaki API key'e geçer.
 */
async function generateWithRetry(
  ai: GoogleGenAI,
  contents: any,
  maxRetries = 3
) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
    } catch (err) {
      lastError = err;
      // Retry edilmemesi gereken hata
      if (!isRetryableError(err)) {
        throw err;
      }
      // Son deneme de başarısızsa artık bekleme
      if (attempt === maxRetries) {
        throw err;
      }
      const delay = getRetryDelay(attempt);
      console.warn(
        `Gemini geçici hata verdi. ` +
          `Retry ${attempt + 1}/${maxRetries}. ` +
          `${delay}ms sonra tekrar denenecek.`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
export async function POST(request: NextRequest) {
  try {
    // ---------------------------------------------------------
    // 1. API KEY'LERİ AL
    // ---------------------------------------------------------
    const apiKeys = collectApiKeys();
    if (apiKeys.length === 0) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY ortam değişkeni tanımlı değil.",
        },
        { status: 500 }
      );
    }
    // ---------------------------------------------------------
    // 2. FORM DATA
    // ---------------------------------------------------------
    const formData = await request.formData();
    const files = formData.getAll("images") as File[];
    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          error: "Görsel dosyası bulunamadı ('images' alanı gerekli).",
        },
        { status: 400 }
      );
    }
    // Maksimum 3 görsel
    const MAX_IMAGES = 3;
    if (files.length > MAX_IMAGES) {
      return NextResponse.json(
        {
          error: `En fazla ${MAX_IMAGES} görsel birden yükleyebilirsin.`,
        },
        { status: 400 }
      );
    }
    // ---------------------------------------------------------
    // 3. DOSYA TİPİ KONTROLÜ
    // ---------------------------------------------------------
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
    // ---------------------------------------------------------
    // 4. FOTOĞRAFLARI BASE64'E ÇEVİR
    // ---------------------------------------------------------
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
    // ---------------------------------------------------------
    // 5. GEMINI CONTENT
    // ---------------------------------------------------------
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
    // ---------------------------------------------------------
    // 6. GEMINI API KEY'LERİNİ SIRAYLA DENE
    //
    // Her key:
    //   İlk deneme
    //   ↓
    //   retry
    //   ↓
    //   retry
    //   ↓
    //   retry
    //
    // Hepsi başarısız olursa 503 döndür.
    // ---------------------------------------------------------
    let rawText: string | undefined;
    let lastError: unknown = null;
    let allKeysFailedWithRetryableError = true;
    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
      const currentKey = apiKeys[keyIndex];
      const ai = new GoogleGenAI({
        apiKey: currentKey,
      });
      try {
        console.log(
          `Gemini API key #${keyIndex + 1}/${apiKeys.length} deneniyor...`
        );
        const response = await generateWithRetry(
          ai,
          contents,
          3
        );
        rawText = response.text;
        lastError = null;
        console.log(
          `Gemini API key #${keyIndex + 1} başarılı.`
        );
        break;
      } catch (err) {
        lastError = err;
        const retryable = isRetryableError(err);
        if (!retryable) {
          allKeysFailedWithRetryableError = false;
          console.error(
            `Gemini API key #${keyIndex + 1} geri döndürülemez hata verdi:`,
            err
          );
          throw err;
        }
        const hasNextKey =
          keyIndex < apiKeys.length - 1;
        if (hasNextKey) {
          console.warn(
            `Gemini API key #${keyIndex + 1} ` +
              `retry'lerden sonra da başarısız oldu. ` +
              `Sıradaki API key'e geçiliyor.`
          );
          continue;
        }
        console.error(
          "Tüm Gemini API key'leri geçici hata nedeniyle başarısız oldu.",
          err
        );
      }
    }
    // ---------------------------------------------------------
    // 7. GEMINI TAMAMEN KULLANILAMIYORSA
    // ---------------------------------------------------------
    if (!rawText) {
      if (
        allKeysFailedWithRetryableError &&
        lastError
      ) {
        return NextResponse.json(
          {
            error:
              "Gemini şu anda yoğun veya geçici olarak kullanılamıyor. Lütfen birkaç saniye sonra tekrar deneyin.",
            retryable: true,
          },
          {
            status: 503,
          }
        );
      }
      throw lastError ?? new Error("Gemini boş yanıt döndürdü.");
    }
    // ---------------------------------------------------------
    // 8. JSON PARSE
    // ---------------------------------------------------------
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
        {
          status: 502,
        }
      );
    }
    // ---------------------------------------------------------
    // 9. KELİME BULUNAMADI
    // ---------------------------------------------------------
    if (extractedWords.length === 0) {
      return NextResponse.json(
        {
          error:
            "Görselde herhangi bir kelime tespit edilemedi.",
          words: [],
        },
        {
          status: 200,
        }
      );
    }
    // ---------------------------------------------------------
    // 10. SUPABASE INSERT
    // ---------------------------------------------------------
    const rowsToInsert = extractedWords.map((item) => ({
      word: item.word?.trim() ?? "",
      preposition:
        item.preposition?.trim() || null,
      meaning:
        item.meaning?.trim() ?? "",
      example_sentence:
        item.example_sentence?.trim() ?? "",
      // SM-2 başlangıç değerleri
      repetitions: 0,
      interval: 1,
      ease_factor: 2.5,
      next_review_date:
        new Date().toISOString(),
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
    // ---------------------------------------------------------
    // 11. SUPABASE HATASI
    // ---------------------------------------------------------
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
        {
          status: 500,
        }
      );
    }
    // ---------------------------------------------------------
    // 12. BAŞARILI
    // ---------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        count: insertedRows?.length ?? 0,
        words: insertedRows,
      },
      {
        status: 201,
      }
    );
  } catch (err) {
    // ---------------------------------------------------------
    // GENEL HATA
    // ---------------------------------------------------------
    console.error(
      "process-image genel hata:",
      err
    );
    const message =
      err instanceof Error
        ? err.message
        : "Bilinmeyen hata";
    // Gemini'nin geçici servis hatasıysa 503 gönder
    if (isRetryableError(err)) {
      return NextResponse.json(
        {
          error:
            "Gemini şu anda yoğun veya geçici olarak kullanılamıyor. Lütfen birkaç saniye sonra tekrar deneyin.",
          details: message,
          retryable: true,
        },
        {
          status: 503,
        }
      );
    }
    return NextResponse.json(
      {
        error:
          "İşlem sırasında beklenmeyen bir hata oluştu.",
        details: message,
      },
      {
        status: 500,
      }
    );
  }
}

Bu sürümdeki temel fark: Gemini 503 verdiğinde artık hemen diğer key’e atlamıyor. Önce aynı key üzerinde 1 → 2 → 4 saniyelik artan beklemelerle 3 kez yeniden deniyor, sonra diğer key’e geçiyor.

Bir de son önemli nokta: gemini-3.6-flash adının senin Google AI projesinde gerçekten erişilebilir olduğundan emin ol. Bugünkü 503’nin nedeni bu loga göre model yoğunluğu, ama model adı/erişimi ayrıca doğrulanması gereken bir konu.
