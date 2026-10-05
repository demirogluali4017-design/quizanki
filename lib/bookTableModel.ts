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

export function parseTable(raw: string): ExtractedWord[] {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("Model tablo döndürmedi.");
  return parsed.map((item) => ({
    word: String(item.word ?? "").trim(),
    preposition: String(item.preposition ?? "").trim(),
    meaning: String(item.meaning ?? "").trim(),
    example_sentence: String(item.example_sentence ?? "").trim(),
  }));
}

export async function photoToTable(image: Buffer, mime: string): Promise<ExtractedWord[]> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID ve CLOUDFLARE_API_TOKEN tanımlı değil.");
  }

  const dataUrl = `data:${mime || "image/jpeg"};base64,${image.toString("base64")}`;
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${BOOK_TABLE_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: TABLE_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 2048,
      }),
    }
  );

  const payload = (await response.json()) as {
    success?: boolean;
    errors?: { message?: string }[];
    result?: { response?: string };
  };

  if (!response.ok || payload.success === false) {
    const message = payload.errors?.map((item) => item.message).filter(Boolean).join(" ") || "Model yanıt vermedi.";
    throw new Error(message);
  }

  const text = payload.result?.response ?? "";
  if (!text) throw new Error("Model boş döndü.");
  return parseTable(text);
}
