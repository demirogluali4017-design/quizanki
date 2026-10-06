const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];

export const READING_PROMPT = `Fransızca bir YDS okuma parçası üret veya verilen metni bu formata çevir.
Kaynak cümlesini kopyalama. 180-280 kelime. Yeni sahte istatistik uydurma.

İşaretler zorunlu:
- Fiil, zaman adıyla: [[v:fondent|présent]]
- Sıfat: [[a:ancien]]
- Bağlaç: [[c:cependant]]
- Gönderim: [[r:elle]]
Zaman yalnız şunlardan biri: présent, imparfait, passé composé, plus-que-parfait, futur, conditionnel, subjonctif.
En az dört fiilde zaman yaz. En az iki sıfat ve iki bağlaç işaretle.

Sorular ve şıklar tamamen Fransızca olsun. Türkçe karakter kullanma.
Dört soru, YDS kalıbı: Idée principale, Détail, Vocabulaire, Inférence.
answer 0-3. why Fransızca. summaryTr Türkçe kalabilir.

Yanıt yalnızca JSON:
{"topic":"","title":"","minutes":4,"sourceNote":"Gemini","paragraphs":[""],"summaryTr":"","questions":[{"kind":"Idée principale","prompt":"","options":["","","",""],"answer":0,"why":""}]}`;

function keys() {
  const found: string[] = [];
  if (process.env.GEMINI_API_KEY) found.push(process.env.GEMINI_API_KEY);
  let i = 2;
  while (process.env[`GEMINI_API_KEY_${i}`]) {
    found.push(process.env[`GEMINI_API_KEY_${i}`] as string);
    i += 1;
  }
  return found;
}

export type GeminiPassage = {
  topic?: string;
  title?: string;
  minutes?: number;
  sourceNote?: string;
  paragraphs?: string[];
  summaryTr?: string;
  questions?: { kind: string; prompt: string; options: string[]; answer: number; why: string }[];
};

function valid(passage: GeminiPassage) {
  const body = (passage.paragraphs ?? []).join(" ");
  const verbs = body.match(/\[\[v:[^\]|]+\|(présent|imparfait|passé composé|plus-que-parfait|futur|conditionnel|subjonctif)\]\]/g) ?? [];
  const adjectives = body.match(/\[\[a:[^\]]+\]\]/g) ?? [];
  const connectors = body.match(/\[\[c:[^\]]+\]\]/g) ?? [];
  const questions = passage.questions ?? [];
  const french = questions.every((question) => !/[ğĞşŞıİ]/.test(`${question.prompt} ${question.options?.join(" ")} ${question.why}`));
  return verbs.length >= 2 && adjectives.length >= 1 && connectors.length >= 1 && questions.length >= 4 && french;
}

export async function formatWithGemini(input: string): Promise<GeminiPassage> {
  let lastError = "Gemini yanıt vermedi.";
  for (const key of keys()) {
    for (const model of MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${READING_PROMPT}\n\nGİRDİ:\n${input.slice(0, 8000)}` }] }],
              generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
            }),
          }
        );
        const data = (await response.json()) as {
          error?: { message?: string };
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        if (!response.ok) throw new Error(data.error?.message || `Gemini ${response.status}`);
        const raw = (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
        const passage = JSON.parse(raw.replace(/^```json\s*|```$/g, "")) as GeminiPassage;
        if (!valid(passage)) throw new Error("Gemini formatı eksik: zaman, sıfat veya Fransızca soru yok.");
        return passage;
      } catch (err) {
        lastError = err instanceof Error ? err.message : lastError;
      }
    }
  }
  throw new Error(lastError);
}
