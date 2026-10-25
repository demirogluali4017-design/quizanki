import { createWorker } from "tesseract.js";

export type OcrWordCandidate = {
  word: string;
  preposition: string;
  meaning: string;
  example_sentence: string;
  rawLine: string;
};

/** Fransızca metin için basit Tesseract OCR. */
export async function recognizeFrench(image: File | Blob): Promise<string> {
  const worker = await createWorker("fra", 1, {
    logger: () => {},
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}

/**
 * Ham OCR metninden basit kelime adayları çıkarır.
 * Bu bir prototiptir: anlam ve örnek cümle boş bırakılır, kullanıcı doldurur.
 * le/la/l' ile başlayan veya edat kalıbı içeren satırları tercih eder.
 */
export function extractCandidatesFromOcr(text: string): OcrWordCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1 && l.length < 120);

  const results: OcrWordCandidate[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Çok kısa veya sadece sayı/noktalama olan satırları atla
    if (/^[\d\s.,;:!?-]+$/.test(line)) continue;

    // Fransızca görünen kelime / kalıp yakala
    const match = line.match(
      /(?:\b(?:le|la|l'|les|un|une|des)\s+)?[A-ZÀ-ÖØ-þà-öø-ÿ][A-ZÀ-ÖØ-þa-zà-öø-ÿ'-]*(?:\s+(?:de|d'|du|des|en|pour|avec|sans|par|sur|sous|dans|chez|vers|contre|entre|parmi|malgré|grâce)\s+[A-ZÀ-ÖØ-þa-zà-öø-ÿ'-]+)*/i
    );

    if (!match) continue;

    let candidate = match[0].trim();
    if (candidate.length < 2) continue;

    // Basit temizlik
    candidate = candidate.replace(/[.,;:!?]+$/, "").trim();

    const key = candidate.toLocaleLowerCase("fr");
    if (seen.has(key)) continue;
    seen.add(key);

    // Edat ayırma denemesi (basit)
    let word = candidate;
    let preposition = "";
    const prepMatch = candidate.match(
      /\s+(de|d'|du|des|en|pour|avec|sans|par|sur|sous|dans|chez|vers|contre|entre|parmi|malgré|grâce)\b/i
    );
    if (prepMatch && prepMatch.index && prepMatch.index > 2) {
      word = candidate.slice(0, prepMatch.index).trim();
      preposition = candidate.slice(prepMatch.index).trim();
    }

    results.push({
      word,
      preposition,
      meaning: "",
      example_sentence: "",
      rawLine: line,
    });
  }

  return results.slice(0, 40); // çok fazla olmasın
}
