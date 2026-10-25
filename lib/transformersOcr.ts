export type OcrWordCandidate = {
  word: string;
  preposition: string;
  meaning: string;
  example_sentence: string;
  rawLine: string;
};

type Pipeline = (input: string | HTMLCanvasElement, options?: { max_new_tokens?: number }) => Promise<{ generated_text?: string } | { generated_text?: string }[]>;

let ocrPipeline: Pipeline | null = null;
let loading: Promise<Pipeline> | null = null;

async function loadPipeline(): Promise<Pipeline> {
  if (ocrPipeline) return ocrPipeline;
  if (loading) return loading;

  loading = (async () => {
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

/** Görseli yatay şeritlere böler (TrOCR tek satır bekler). */
async function sliceImage(file: File | Blob, stripHeight = 80): Promise<HTMLCanvasElement[]> {
  const bitmap = await createImageBitmap(file);
  const strips: HTMLCanvasElement[] = [];
  const w = bitmap.width;
  const h = bitmap.height;

  for (let y = 0; y < h; y += stripHeight) {
    const sh = Math.min(stripHeight, h - y);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, y, w, sh, 0, 0, w, sh);
    strips.push(canvas);
  }

  bitmap.close();
  return strips;
}

/** Transformers.js TrOCR ile görselden metin çıkarır. */
export async function recognizeWithTransformers(image: File | Blob): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Bu işlem sadece tarayıcıda çalışır.");
  }

  const pipe = await loadPipeline();
  const strips = await sliceImage(image, 70);
  const texts: string[] = [];

  for (const strip of strips) {
    try {
      const result = await pipe(strip, { max_new_tokens: 128 });
      const text = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
      if (typeof text === "string" && text.trim()) {
        texts.push(text.trim());
      }
    } catch {
      // bir şerit başarısız olsa devam et
    }
  }

  return texts.join("\n");
}

/** Ham metinden kelime adayları çıkarır (daha esnek). */
export function extractCandidatesFromOcr(text: string): OcrWordCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const results: OcrWordCandidate[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Basit kelime ayırma: boşluk ve noktalama
    const tokens = line.split(/[\s,;:.!?()\[\]"'—–]+/).filter((t) => t.length >= 3 && /[a-zA-Zà-ÿÀ-ÿ]/.test(t));

    for (const token of tokens) {
      const clean = token.replace(/^[^a-zA-Zà-ÿÀ-ÿ]+|[^a-zA-Zà-ÿÀ-ÿ]+$/g, "");
      if (clean.length < 3) continue;

      const key = clean.toLocaleLowerCase("fr");
      if (seen.has(key)) continue;
      seen.add(key);

      // Basit edat kontrolü
      let word = clean;
      let preposition = "";
      const prepMatch = clean.match(/^(le|la|l'|les|un|une|des)\s+(.+)/i);
      if (prepMatch) {
        word = prepMatch[0];
      }

      results.push({
        word,
        preposition,
        meaning: "",
        example_sentence: "",
        rawLine: line,
      });
    }
  }

  return results.slice(0, 50);
}
