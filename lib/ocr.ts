export interface OcrToken {
  id: string;
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrPage {
  tokens: OcrToken[];
  width: number;
  height: number;
}

const LETTER = /[A-Za-zÀ-ÖØ-öø-ÿĞğİıŞşÇçÖöÜü]/;

export async function recognizeImage(
  file: File,
  pageIndex: number,
  onProgress?: (progress: number) => void
): Promise<OcrPage> {
  const { createWorker } = await import("tesseract.js");
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close?.();

  const worker = await createWorker("fra+tur", 1, {
    logger: (message) => {
      if (message.status === "recognizing text" && typeof message.progress === "number") {
        onProgress?.(message.progress);
      }
    },
  });

  try {
    const { data } = await worker.recognize(file);
    const tokens: OcrToken[] = [];
    data.words?.forEach((word, index) => {
      const text = word.text.replace(/\s+/g, " ").trim();
      if (!text || !LETTER.test(text)) return;
      if (text.length < 2 && word.confidence < 80) return;
      if (word.confidence < 40) return;
      tokens.push({
        id: `${pageIndex}-${index}`,
        text,
        confidence: word.confidence,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        },
      });
    });
    tokens.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
    return { tokens, width, height };
  } finally {
    await worker.terminate();
  }
}
