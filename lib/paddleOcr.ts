export type OcrWordCandidate = {
  word: string;
  preposition: string;
  meaning: string;
  example_sentence: string;
  rawLine: string;
};

export type OcrBox = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};

type Worker = {
  recognize: (
    image: File | Blob | string,
    options?: unknown,
    output?: { text?: boolean; blocks?: boolean }
  ) => Promise<{ data: { text?: string; blocks?: unknown[] } }>;
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

/** Bounding box’lu kelimeleri döner (Quizlet tarzı seçim için). */
export async function recognizeWithPaddleBoxes(image: File | Blob): Promise<OcrBox[]> {
  if (typeof window === "undefined") {
    throw new Error("Bu işlem sadece tarayıcıda çalışır.");
  }

  const worker = await getWorker();
  const result = await worker.recognize(image, undefined, { text: true, blocks: true });
  const boxes: OcrBox[] = [];

  const blocks = (result.data.blocks ?? []) as Array<{
    paragraphs?: Array<{
      lines?: Array<{
        words?: Array<{
          text?: string;
          confidence?: number;
          bbox?: { x0: number; y0: number; x1: number; y1: number };
        }>;
      }>;
    }>;
  }>;

  for (const block of blocks) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          const text = (word.text ?? "").trim();
          if (text.length < 2 || !word.bbox) continue;
          boxes.push({
            text,
            confidence: word.confidence ?? 0,
            bbox: word.bbox,
          });
        }
      }
    }
  }

  return boxes;
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
    const tokens = line.split(/[\s,;:.!?()\[\]\"'—–]+/).filter((t) => t.length >= 3 && /[a-zA-Zà-ÿÀ-ÿ]/.test(t));

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
