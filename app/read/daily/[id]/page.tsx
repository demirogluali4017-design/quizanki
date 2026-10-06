import { notFound } from "next/navigation";
import ReadingView from "@/components/ReadingView";
import { createServiceRoleClient } from "@/lib/supabase";
import { ReadingPassage } from "@/lib/readings";

export const dynamic = "force-dynamic";

export default async function DailyReadingPage({ params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("readings").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const passage: ReadingPassage = {
    id: data.id,
    topic: data.topic,
    title: data.title,
    minutes: data.minutes ?? 4,
    sourceNote: data.source_note || "Konudan yeniden yazıldı",
    paragraphs: data.paragraphs ?? [],
    summaryTr: data.summary_tr || "",
    questions: data.questions ?? [],
  };
  return <ReadingView passage={passage} />;
}
