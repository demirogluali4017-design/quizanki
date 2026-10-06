export type LiveArticle = {
  title: string;
  url: string;
  excerpt: string;
  source: string;
};

const FEEDS = [
  { source: "Le Monde Sciences", url: "https://www.lemonde.fr/sciences/rss_full.xml" },
  { source: "Le Monde Éducation", url: "https://www.lemonde.fr/education/rss_full.xml" },
  { source: "Le Monde Économie", url: "https://www.lemonde.fr/economie/rss_full.xml" },
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

export async function fetchLiveArticles(): Promise<LiveArticle[]> {
  const articles: LiveArticle[] = [];
  for (const feed of FEEDS) {
    try {
      const response = await fetch(feed.url, { cache: "no-store", headers: { "User-Agent": "Quizanki/1.0" } });
      if (!response.ok) continue;
      const xml = await response.text();
      for (const item of xml.split(/<item>/i).slice(1, 3)) {
        const title = decode((item.match(/<title>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "");
        const url = decode((item.match(/<link>([\s\S]*?)<\/link>/i) ?? [])[1] ?? "");
        const excerpt = decode((item.match(/<description>([\s\S]*?)<\/description>/i) ?? [])[1] ?? "");
        if (!title || !url.includes("/article/")) continue;
        articles.push({ title, url, excerpt, source: feed.source });
      }
    } catch {
      continue;
    }
  }
  return articles.slice(0, 5);
}

export async function findLiveArticle(url: string) {
  const articles = await fetchLiveArticles();
  return articles.find((article) => article.url === url) ?? null;
}
