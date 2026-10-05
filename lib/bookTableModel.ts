import { ExtractedWord } from "@/types";

/** Fotoğrafı yalnızca dört sütunluk tabloya çeviren model. Gemini değildir. */
export const BOOK_TABLE_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const TABLE_PROMPT = `Bu görsel bir Fransızca kelime kitabı sayfasıdır. Görevin yalnızca kalın yazılmış öğretilen kelimeleri tabloya dökmek.

Her satırda tam dört alan:
- word: fiilse mastar. İsimse cinsiyet tanımlığıyla yaz (la crue, le roi, l'histoire). Sayfada (e) veya un(e) varsa bırak.
- preposition: fiil bu cümlede edatla geçiyorsa kalıp, yoksa boş.
- meaning: kısa Türkçe anlam. Fransızca tanım yazma.
- example_sentence: o kelimenin geçtiği kitaptaki Fransızca cümle. Yeni cümle uydurma.

Kişi adı, sayfa no ve Remarque kart olmasın. Aynı kelimeyi bir kez yaz.
Yanıt yalnızca JSON array olsun.
[{"word":"","preposition":"","meaning":"","example_sentence":""}]`;

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("\n");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["response", "description", "text", "content", "output"]) {
      if (key in record) {
        const nested = asText(record[key]);
        if (nested) return nested;
      }
    }
  }
  return "";
}

export function parseTable(raw: unknown): ExtractedWord[] {
  const cleaned = asText(raw)
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Model tablo yerine yazı döndürdü.");
  }
  if (!Array.isArray(parsed)) throw new Error("Model tablo döndürmedi.");
  return parsed.map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      word: asText(row.word).trim(),
      preposition: asText(row.preposition).trim(),
      meaning: asText(row.meaning).trim(),
      example_sentence: asText(row.example_sentence).trim(),
    };
  });
}

type AiPayload = {
  success?: boolean;
  errors?: { message?: string }[];
  result?: { response?: string; description?: string };
};

function endpoint(account: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${BOOK_TABLE_MODEL}`;
}

async function runModel(account: string, token: string, body: unknown): Promise<AiPayload> {
  const response = await fetch(endpoint(account), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return (await response.json()) as AiPayload;
}

function failureMessage(payload: AiPayload): string | null {
  if (payload.success === false || (payload.errors && payload.errors.length > 0 && !payload.result?.response)) {
    return payload.errors?.map((item) => item.message).filter(Boolean).join(" ") || "Model yanıt vermedi.";
  }
  return null;
}

export async function photoToTable(image: Buffer, mime: string): Promise<ExtractedWord[]> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID ve CLOUDFLARE_API_TOKEN tanımlı değil.");
  }

  const dataUrl = `data:${mime || "image/jpeg"};base64,${image.toString("base64")}`;
  const requestBody = {
    messages: [
      { role: "system", content: "Yanıtın yalnızca istenen JSON array olsun." },
      { role: "user", content: TABLE_PROMPT },
    ],
    image: dataUrl,
    max_tokens: 2048,
  };

  let payload = await runModel(account, token, requestBody);
  let message = failureMessage(payload);
  if (message && /agree|Model Agreement/i.test(message)) {
    const agreed = await runModel(account, token, { prompt: "agree" });
    const agreeError = failureMessage(agreed);
    if (agreeError && !/agree/i.test(agreeError)) throw new Error(agreeError);
    payload = await runModel(account, token, requestBody);
    message = failureMessage(payload);
  }
  if (message) throw new Error(message);

  const text = asText(payload.result);
  if (!text.trim()) throw new Error("Model boş döndü.");
  return parseTable(text);
}
