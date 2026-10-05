import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { photoToTable } from "@/lib/bookTableModel";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fotoğraf yok." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const rows = await photoToTable(bytes, file.type || "image/jpeg");
    return NextResponse.json({
      success: true,
      saved: false,
      count: rows.length,
      words: rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Model çalışmadı.";
    const missing = message.includes("CLOUDFLARE_");
    return NextResponse.json({ error: message }, { status: missing ? 503 : 502 });
  }
}
