import { notFound } from "next/navigation";
import ReadingView from "@/components/ReadingView";
import { getReading } from "@/lib/readings";

export const dynamic = "force-dynamic";

export default function ReadingPage({ params }: { params: { id: string } }) {
  const passage = getReading(params.id);
  if (!passage) notFound();
  return <ReadingView passage={passage} />;
}
