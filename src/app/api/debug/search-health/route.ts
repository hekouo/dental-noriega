import { NextResponse } from "next/server";
import { getPublicSupabase } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getPublicSupabase();
  const envOk =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const feat = await s
    .from("featured")
    .select("product_slug", { count: "exact", head: true });
  const cat = await s
    .from("api_catalog_with_images")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    envOk,
    featuredCount: feat.count ?? 0,
    catalogCount: cat.count ?? 0,
  });
}
