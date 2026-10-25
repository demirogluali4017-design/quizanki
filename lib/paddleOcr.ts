export type OcrWordCandidate = {
  word: string;
  preposition: string;
  meaning: string;
  example_sentence: string;
  rawLine: string;
};

type Worker = {
  recognize: (image: File | Blob | string) => Promise<{ data: { text?: string } }>;
  terminate: () => Promise<void>;
};

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    const url = "https://cdn.jsdelivr.net/npm/litert-ocr@0.1.0/+esm";
    const mod = await import(/* webpackIgnore: true */ url);
    const { createWorker } = mod;
    const worker = await createWorker("eng");
    return worker as Worker;
  })();

  return workerPromise;
}

/** PP-OCRv6 Small (litert-ocr) ile görselden metin çıkarır. Tamamen tarayıcıda. */
export async function recognizeWithPaddle(image: File | Blob): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Bu işlem sadece tarayıcıda çalışır.");
  }

  const worker = await getWorker();
  const result = await worker.recognize(image);
  return result.data.text ?? "";
}

/** Ham metinden kelime adayları çıkarır. */
export function extractCandidatesFromOcr(text: string): OcrWordCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const results: OcrWordCandidate[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const tokens = line.split(/[\s,;:.!?()\[\]"'—–]+/).filter((t) => t.length >= 3 && /[a-zA-Zà-ÿÀ-ÿ]/.test(t));

    for (const token of tokens) {
      const clean = token.replace(/^[^a-zA-Zà-ÿÀ-ÿ]+|[^a-zA-Zà-ÿÀ-ÿ]+$/g, "");
      if (clean.length < 3) continue;

      const key = clean.toLocaleLowerCase("fr");
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        word: clean,
        preposition: "",
        meaning: "",
        example_sentence: "",
        rawLine: line,
      });
    }
  }

  return results.slice(0, 50);
}
