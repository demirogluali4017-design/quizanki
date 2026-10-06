import { createServiceRoleClient } from "@/lib/supabase";
import { formatWithGemini } from "@/lib/geminiReading";

const FEEDS = [
  "https://www.france24.com/fr/rss",
  "https://www.lemonde.fr/sciences/rss_full.xml",
];

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
  const topics: { title: string; url: string; excerpt: string }[] = [];
  for (const feed of FEEDS) {
    try {
      const response = await fetch(feed, { cache: "no-store" });
      if (!response.ok) continue;
      const xml = await response.text();
      const items = xml.split(/<item>/i).slice(1, 8);
      for (const item of items) {
        const title = decode((item.match(/<title>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "");
        const url = decode((item.match(/<link>([\s\S]*?)<\/link>/i) ?? [])[1] ?? "");
        const excerpt = decode((item.match(/<description>([\s\S]*?)<\/description>/i) ?? [])[1] ?? "");
        if (title.length > 12 && excerpt.length > 80 && !topics.some((topic) => topic.title === title)) {
          topics.push({ title, url, excerpt });
        }
      }
    } catch {
      continue;
    }
  }
  return topics.slice(0, 5);
}

function sameDifficulty(plain: string, excerpt: string) {
  const normalize = (value: string) => value.toLocaleLowerCase("fr").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const left = normalize(plain).split(" ").filter((word) => word.length > 4);
  const right = new Set(normalize(excerpt).split(" ").filter((word) => word.length > 4));
  if (left.length < 12 || right.size < 12) return false;
  const shared = left.filter((word) => right.has(word)).length;
  return shared / left.length > 0.55;
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
    const passage = await formatWithGemini(`Metni sadeleştirme, kısaltma, yeniden yazma. Cümleler ve zorluk kaynak özetindeki gibi kalsın. Yalnızca fiil zamanı, sıfat ve bağlaç işaretlerini ekle, Fransızca YDS sorularını yaz.\n\nBAŞLIK: ${topic.title}\nMETİN:\n${topic.excerpt}`);
    const plain = (passage.paragraphs ?? []).join(" ").replace(/\[\[(?:v|a|c|r):([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1");
    if (!passage.paragraphs?.length || !sameDifficulty(plain, topic.excerpt)) continue;
    const { error } = await supabase.from("readings").insert({
      created_on: today,
      topic: passage.topic || "Okuma",
      title: topic.title,
      minutes: passage.minutes || 4,
      source_note: "Akıştaki özet olduğu gibi durur. Tam makale kaynak linkindedir.",
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
