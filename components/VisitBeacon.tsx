"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function VisitBeacon() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      await supabase.from("app_settings").update({ last_seen_at: new Date().toISOString() }).eq("id", 1);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
