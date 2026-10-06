import { createServiceRoleClient } from "@/lib/supabase";

const FEEDS = [
  "https://www.france24.com/fr/rss",
  "https://www.lemonde.fr/sciences/rss_full.xml",
];

const PROMPT = `Sana yalnızca bir haber başlığı verilecek. O konudan 180-280 kelimelik özgün bir Fransızca YDS parçası yaz.
Kaynak cümlesini kopyalama, alıntı yapma, paragrafı yeniden kurma. Yeni sahte istatistik uydurma.
İşaretler: fiil [[v:fondent|présent]], sıfat [[a:ancien]], bağlaç [[c:cependant]], gönderim [[r:elle]]. Zaman adı présent, imparfait, passé composé, plus-que-parfait, futur, conditionnel veya subjonctif olsun.
Dört soru ve şıklar Fransızca, YDS kalıbında: idée principale, détail, vocabulaire en contexte, inférence. answer 0-3. why Fransızca. summaryTr yine Türkçe kalsın.
Yanıt yalnızca JSON:
{"topic":"","title":"","minutes":4,"sourceNote":"Konudan yeniden yazıldı","paragraphs":[""],"summaryTr":"","questions":[{"kind":"Idée principale","prompt":"","options":["","","",""],"answer":0,"why":""}]}`;

function collectApiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  let i = 2;
  while (process.env[`GEMINI_API_KEY_${i}`]) {
    keys.push(process.env[`GEMINI_API_KEY_${i}`] as string);
    i += 1;
  }
  return keys;
}

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/&#39;|'/g, "'")
    .replace(/"/g, '"')
    .replace(/<[^>]+>/g, "")
    .trim();
}

async function fetchTopics() {
  const topics: { title: string; url: string }[] = [];
  for (const feed of FEEDS) {
    try {
      const response = await fetch(feed, { cache: "no-store" });
      if (!response.ok) continue;
      const xml = await response.text();
      const items = xml.split(/<item>/i).slice(1, 8);
      for (const item of items) {
        const title = decode((item.match(/<title>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "");
        const url = decode((item.match(/<link>([\s\S]*?)<\/link>/i) ?? [])[1] ?? "");
        if (title.length > 12 && !topics.some((topic) => topic.title === title)) {
          topics.push({ title, url });
        }
      }
    } catch {
      continue;
    }
  }
  return topics.slice(0, 5);
}

async function writePassage(title: string) {
  const keys = collectApiKeys();
  let lastError = "Gemini yanıt vermedi.";
  for (const key of keys) {
    for (const model of ["gemini-3.5-flash-lite", "gemini-3.8-flash"]) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${PROMPT}\n\nBAŞLIK:\n${title}` }] }],
              generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
            }),
          }
        );
        const data = (await response.json()) as {
          error?: { message?: string };
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        if (!response.ok) throw new Error(data.error?.message || `Gemini ${response.status}`);
        const raw = (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
        return JSON.parse(raw.replace(/^```json\s*|```$/g, "")) as {
          topic?: string;
          title?: string;
          minutes?: number;
          sourceNote?: string;
          paragraphs?: string[];
          summaryTr?: string;
          questions?: unknown[];
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : lastError;
      }
    }
  }
  throw new Error(lastError);
}

function copiesTitle(passage: string, title: string) {
  const words = title
    .toLocaleLowerCase("fr")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 4);
  if (words.length < 6) return false;
  const haystack = passage.toLocaleLowerCase("fr");
  const needle = words.slice(0, 8).join(" ");
  return haystack.includes(needle);
}

export async function refreshDailyReadings() {
  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from("readings")
    .select("id", { count: "exact", head: true })
    .eq("created_on", today);
  if ((count ?? 0) >= 5) return { created: 0, skipped: "Bugünün parçaları hazır." };

  const topics = await fetchTopics();
  if (topics.length === 0) return { created: 0, skipped: "Kaynak başlığı alınamadı." };

  let created = 0;
  for (const topic of topics) {
    const passage = await writePassage(topic.title);
    const plain = (passage.paragraphs ?? []).join(" ").replace(/\[\[(?:v|c|r):([^\]]+)\]\]/g, "$1");
    if (!passage.paragraphs?.length || copiesTitle(plain, topic.title)) continue;
    const { error } = await supabase.from("readings").insert({
      created_on: today,
      topic: passage.topic || "Okuma",
      title: passage.title || topic.title,
      minutes: passage.minutes || 4,
      source_note: "Başlık konudur. Metin yeniden yazıldı, kaynak cümle saklanmaz.",
      source_title: topic.title,
      source_url: topic.url,
      paragraphs: passage.paragraphs,
      summary_tr: passage.summaryTr || "",
      questions: passage.questions ?? [],
    });
    if (!error) created += 1;
  }
  return { created, topics: topics.length };
}
