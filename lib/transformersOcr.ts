import { pipeline, env } from "@huggingface/transformers";

// Tarayıcıda model indirmeyi engelleme (CDN'den yükler)
env.allowLocalModels = false;

export type OcrWordCandidate = {
  word: string;
  preposition: string;
  meaning: string;
  example_sentence: string;
  rawLine: string;
};

let ocrPipeline: Awaited<ReturnType<typeof pipeline>> | null = null;

/** Transformers.js TrOCR ile görselden metin çıkarır. */
export async function recognizeWithTransformers(image: File | Blob): Promise<string> {
  if (!ocrPipeline) {
    ocrPipeline = await pipeline("image-to-text", "Xenova/trocr-small-printed", {
      dtype: "q8",
    });
  }

  const url = URL.createObjectURL(image);
  try {
    const result = await ocrPipeline(url, {
      max_new_tokens: 512,
    });
    const text = Array.isArray(result) ? result[0]?.generated_text : (result as any)?.generated_text;
    return typeof text === "string" ? text : "";
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Ham metinden basit kelime adayları çıkarır (prototip). */
export function extractCandidatesFromOcr(text: string): OcrWordCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && l.length < 140);

  const results: OcrWordCandidate[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (/^[\d\s.,;:!?-]+$/.test(line)) continue;

    const match = line.match(
      /(?:\b(?:le|la|l'|les|un|une|des)\s+)?[A-ZÀ-ÖØ-þà-öø-ÿ][A-ZÀ-ÖØ-þa-zà-öø-ÿ'-]*(?:\s+(?:de|d'|du|des|en|pour|avec|sans|par|sur|sous|dans|chez|vers|contre|entre|parmi)\s+[A-ZÀ-ÖØ-þa-zà-öø-ÿ'-]+)*/i
    );

    if (!match) continue;

    let candidate = match[0].trim().replace(/[.,;:!?]+$/, "");
    if (candidate.length < 3) continue;

    const key = candidate.toLocaleLowerCase("fr");
    if (seen.has(key)) continue;
    seen.add(key);

    let word = candidate;
    let preposition = "";
    const prepMatch = candidate.match(
      /\s+(de|d'|du|des|en|pour|avec|sans|par|sur|sous|dans|chez|vers|contre|entre|parmi)\b/i
    );
    if (prepMatch && prepMatch.index && prepMatch.index > 3) {
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

  return results.slice(0, 40);
}
