export type OcrWordCandidate = {
  word: string;
  preposition: string;
  meaning: string;
  example_sentence: string;
  rawLine: string;
};

type Pipeline = (input: string, options?: { max_new_tokens?: number }) => Promise<{ generated_text?: string } | { generated_text?: string }[]>;

let ocrPipeline: Pipeline | null = null;
let loading: Promise<Pipeline> | null = null;

async function loadPipeline(): Promise<Pipeline> {
  if (ocrPipeline) return ocrPipeline;
  if (loading) return loading;

  loading = (async () => {
    // Webpack'in görmemesi için runtime'da CDN'den yükle
    const url = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2";
    const mod = await import(/* webpackIgnore: true */ url);
    const { pipeline, env } = mod;
    env.allowLocalModels = false;
    const pipe = await pipeline("image-to-text", "Xenova/trocr-small-printed", {
      dtype: "q8",
    });
    ocrPipeline = pipe as Pipeline;
    return ocrPipeline;
  })();

  try {
    return await loading;
  } finally {
    loading = null;
  }
}

/** Transformers.js TrOCR ile görselden metin çıkarır (CDN, sadece tarayıcı). */
export async function recognizeWithTransformers(image: File | Blob): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Bu işlem sadece tarayıcıda çalışır.");
  }

  const pipe = await loadPipeline();
  const url = URL.createObjectURL(image);
  try {
    const result = await pipe(url, { max_new_tokens: 512 });
    const text = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
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
