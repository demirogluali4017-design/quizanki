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

function toRow(item: unknown): ExtractedWord {
  const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  return {
    word: asText(row.word ?? row.kelime).trim(),
    preposition: asText(row.preposition ?? row.prep ?? row.edat).trim(),
    meaning: asText(row.meaning ?? row.anlam).trim(),
    example_sentence: asText(row.example_sentence ?? row.example ?? row.ornek).trim(),
  };
}

function rowsFromProse(text: string): ExtractedWord[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !/^\|\s*:?-{2,}/.test(line));
  if (lines.length >= 2) {
    const cells = lines.map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
    const body = /kelime|word|anlam|meaning/i.test(cells[0].join(" ")) ? cells.slice(1) : cells;
    const rows = body
      .filter((cols) => cols.length >= 2)
      .map((cols) => ({
        word: cols[0] ?? "",
        preposition: cols[1] ?? "",
        meaning: cols[2] ?? "",
        example_sentence: cols[3] ?? "",
      }))
      .filter((row) => row.word && row.meaning);
    if (rows.length) return rows;
  }

  const chunks = text.split(/\n(?=\d+[\).\s]|[-*]\s|word\s*[:：]|kelime\s*[:：])/i);
  const labeled: ExtractedWord[] = [];
  for (const chunk of chunks) {
    const pick = (names: string) => chunk.match(new RegExp(`(?:${names})\\s*[:：]\\s*(.+)`, "i"))?.[1]?.trim() ?? "";
    const word = pick("word|kelime");
    const meaning = pick("meaning|anlam");
    if (!word || !meaning) continue;
    labeled.push({
      word,
      preposition: pick("preposition|prep|edat"),
      meaning,
      example_sentence: pick("example_sentence|example|örnek|cümle"),
    });
  }
  return labeled;
}

export function parseTable(raw: unknown): ExtractedWord[] {
  const cleaned = asText(raw)
    .trim()
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  let json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  if (start >= 0 && end <= start) {
    const lastObject = cleaned.lastIndexOf("}");
    if (lastObject > start) json = `${cleaned.slice(start, lastObject + 1).replace(/,\s*$/, "")}]`;
  }
  json = json.replace(/,\s*([}\]])/g, "$1").replace(/[“”]/g, '"');

  try {
    const parsed = JSON.parse(json) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? Object.values(parsed).find((value) => Array.isArray(value))
        : null;
    if (Array.isArray(list)) {
      const rows = list.map(toRow).filter((row) => row.word || row.meaning);
      if (rows.length) return rows;
    }
  } catch {
    // Yazı veya yarım JSON aşağıda satır satır denenir.
  }

  const prose = rowsFromProse(cleaned);
  if (prose.length) return prose;
  throw new Error("Model tablo yerine yazı döndürdü.");
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

  const requestBody = {
    prompt: TABLE_PROMPT,
    image: image.toString("base64"),
    max_tokens: 1800,
  };

  const read = async (prompt: string) => {
    let payload = await runModel(account, token, { ...requestBody, prompt });
    let message = failureMessage(payload);
    if (message && /agree|Model Agreement/i.test(message)) {
      const agreed = await runModel(account, token, { prompt: "agree" });
      const agreeError = failureMessage(agreed);
      if (agreeError && !/agree/i.test(agreeError)) throw new Error(agreeError);
      payload = await runModel(account, token, { ...requestBody, prompt });
      message = failureMessage(payload);
    }
    if (message) throw new Error(message);
    const text = asText(payload.result) || asText(payload);
    if (!text.trim()) throw new Error("Model boş döndü.");
    return parseTable(text);
  };

  try {
    return await read(TABLE_PROMPT);
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("yazı")) throw err;
    return read(`${TABLE_PROMPT}\nAçıklama yazma. Yalnızca JSON array döndür.`);
  }
}
