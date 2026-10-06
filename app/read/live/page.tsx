import Link from "next/link";
import ReadingView from "@/components/ReadingView";
import { findLiveArticle } from "@/lib/liveArticles";
import { formatWithGemini } from "@/lib/geminiReading";
import { ReadingPassage, ReadingQuestion } from "@/lib/readings";

export const dynamic = "force-dynamic";

const KINDS = ["Idée principale", "Détail", "Vocabulaire", "Inférence"] as const;

function asQuestions(value: { kind: string; prompt: string; options: string[]; answer: number; why: string }[] | undefined): ReadingQuestion[] {
  return (value ?? []).slice(0, 4).map((question, index) => ({
    kind: KINDS.includes(question.kind as (typeof KINDS)[number]) ? question.kind as ReadingQuestion["kind"] : KINDS[index],
    prompt: question.prompt,
    options: question.options,
    answer: question.answer,
    why: question.why,
  }));
}

export default async function LiveReadingPage({ searchParams }: { searchParams: { url?: string } }) {
  const url = searchParams.url ?? "";
  const article = url ? await findLiveArticle(url) : null;
  if (!article) {
    return (
      <main className="mx-auto max-w-lg px-5 py-8">
        <p>Bu makale akışta yok.</p>
        <Link href="/read" className="mt-4 inline-block text-indigo-600">Geri dön</Link>
      </main>
    );
  }

  const sourceText = article.excerpt || article.title;
  let passage: ReadingPassage = {
    id: article.url,
    topic: article.source,
    title: article.title,
    minutes: 4,
    sourceNote: "Akıştaki gerçek özet. Tam makale alttaki linkte.",
    sourceUrl: article.url,
    sourceTitle: article.title,
    paragraphs: [sourceText],
    summaryTr: "",
    questions: [],
  };

  try {
    const formatted = await formatWithGemini(
      `Metni değiştirme, sadeleştirme, yeniden yazma. Yalnızca fiil zamanı, sıfat ve bağlaç işaretle. Sorular Fransızca olsun.\n\nBAŞLIK: ${article.title}\nMETİN:\n${sourceText}`
    );
    passage = {
      ...passage,
      title: article.title,
      paragraphs: formatted.paragraphs?.length ? formatted.paragraphs : passage.paragraphs,
      summaryTr: formatted.summaryTr || "",
      questions: asQuestions(formatted.questions),
    };
  } catch {
    passage.summaryTr = "İşaretleme şu an kurulamadı. Metin kaynağın kendi özetidir.";
  }

  return <ReadingView passage={passage} />;
}
