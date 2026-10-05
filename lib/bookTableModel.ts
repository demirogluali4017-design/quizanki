import { ExtractedWord } from "@/types";

/** Fotoğrafı yalnızca dört sütunluk tabloya çeviren model. Gemini değildir. */
export const BOOK_TABLE_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const TABLE_PROMPT = `Bu fotoğraf bir Fransızca fiil tablosudur. Sütunlar: MOT, SYNONYMES, PRÉPOSITION(S), ANTONYMES, EXEMPLE. Tablonun üstünde grubun Türkçe anlamı yazar, örneğin "VERMEK / SAĞLAMAK / SUNMAK".

Her MOT satırı bir karttır. Satır atlama.

- word: MOT sütunundaki fiil, olduğu gibi. Donner, Fournir, Procurer.
- preposition: O satırın PRÉPOSITION hücresindeki HER satırı kopyala. "qch.", "qch. à qn.", "qch. à f. qch.", "qch. de qn." birer edattır; bunları boş sanma, kısaltma, "à" diye bozma, örnek cümleden kendin üretme. Birden fazlaysa virgülle yaz: "qch. à f. qch., qch. à qn., qch.". Hücrede ne varsa eksiksiz o.
- meaning: Üstteki Türkçe başlığın TAMAMI. "VERMEK / SAĞLAMAK / SUNMAK" ise anlam "vermek, sağlamak, sunmak" olsun. Yalnızca ilk kelimeyi yazmak yasak. Boş bırakmak yasak.
- example_sentence: O satırın EXEMPLE hücresindeki cümle. Hücrede birden fazla cümle varsa hepsini yaz. Başka satırın cümlesini alma.

Yanıt yalnızca JSON array olsun.
[{"word":"Donner","preposition":"qch. à f. qch., qch. à qn.","meaning":"vermek, sağlamak, sunmak","example_sentence":"..."}]`;

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(asText).filter((part) => part.trim()).join("\n");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["response", "description", "text", "content", "output", "completion"]) {
      if (key in record) {
        const nested = asText(record[key]);
        if (nested.trim()) return nested;
      }
    }
    return Object.entries(record)
      .filter(([key]) => !["success", "errors", "messages"].includes(key))
      .map(([, item]) => asText(item))
      .filter((part) => part.trim())
      .join("\n");
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

function splitGlued(row: ExtractedWord): ExtractedWord {
  let { word, preposition, meaning, example_sentence } = row;
  if (/^(ayır(mak)?|ayrı yaz(ın)?|separate)$/i.test(meaning.trim())) meaning = "";

  const glued = word.match(/^(.+?)\s*(?:=|:|—|–|-|\/)\s*(.+)$/);
  if (glued) {
    const left = glued[1].trim();
    const right = glued[2].trim();
    const leftTurkish = /[ğĞşŞıİöÖçÇ]/.test(left);
    const rightTurkish = /[ğĞşŞıİöÖçÇ]/.test(right);
    if (!leftTurkish && (rightTurkish || !meaning)) {
      word = left;
      meaning = meaning || right;
    } else if (leftTurkish && !rightTurkish) {
      meaning = meaning || left;
      word = right;
    }
  }

  preposition = preposition
    .split(/\s*\/\s*|\s*;\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  return { word: word.trim(), preposition, meaning: meaning.trim(), example_sentence };
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
      const rows = list.map(toRow).map(splitGlued).filter((row) => row.word || row.meaning);
      if (rows.length) return rows;
    }
  } catch {
    // Yazı veya yarım JSON aşağıda satır satır denenir.
  }

  const prose = rowsFromProse(cleaned).map(splitGlued);
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

  const base = image.toString("base64");
  const ask = async (body: unknown) => {
    let payload = await runModel(account, token, body);
    let message = failureMessage(payload);
    if (message && /agree|Model Agreement/i.test(message)) {
      await runModel(account, token, { prompt: "agree" });
      payload = await runModel(account, token, body);
      message = failureMessage(payload);
    }
    if (message) throw new Error(message);
    return { text: asText(payload.result) || asText(payload), payload };
  };

  let { text, payload } = await ask({
    prompt: TABLE_PROMPT,
    image: base,
    max_tokens: 1024,
  });

  if (!text.trim()) {
    const again = await ask({
      messages: [{ role: "user", content: TABLE_PROMPT }],
      image: `data:${mime || "image/jpeg"};base64,${base}`,
      max_tokens: 1024,
    });
    text = again.text;
    payload = again.payload;
  }

  if (!text.trim()) {
    throw new Error(`Model boş döndü. ${JSON.stringify(payload).slice(0, 320)}`);
  }

  try {
    return parseTable(text);
  } catch {
    const converted = await ask({
      prompt: `Bu metni yalnızca JSON array yap. Alanlar: word, preposition, meaning, example_sentence. Başka yazı yazma.\n${text.slice(0, 5000)}`,
      max_tokens: 1024,
    });
    if (!converted.text.trim()) throw new Error("Model tablo kuramadı.");
    return parseTable(converted.text);
  }
}
