import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function requireUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const email = user?.email?.toLowerCase();
  if (!user || (owner && email !== owner)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Giriş gerekli." }, { status: 401 }),
    };
  }

  return { user, response: null };
}
