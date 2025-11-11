import { NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { getPublicSupabase } from "@/lib/supabase/public";

export async function GET() {
  const env = getPublicEnv();
  let featuredCount = null;
  try {
    const s = getPublicSupabase();
    const { data } = await s.from("featured").select("product_id");
    featuredCount = data?.length ?? 0;
  } catch {
    // Silenciar errores
  }
  return NextResponse.json({
    envOk: env.ok,
    nodeEnv: env.nodeEnv,
    featuredCount,
  });
}
