import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReviewRow = {
  id: string;
  created_at: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string | null;
  is_example: boolean;
  is_published: boolean;
  source: string | null;
  user_id: string | null;
  meta: Record<string, unknown>;
};

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * GET /api/admin/reviews
 * Query: status=pending|published|examples|all, product_id?, limit?, cursor?
 * Response: { items: Review[], nextCursor: string|null }
 */
export async function GET(req: NextRequest): Promise<NextResponse<unknown>> {
  try {
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json({ ok: false, code: "unauthorized", message: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") ?? "pending") as "pending" | "published" | "examples" | "all";
    const productId = searchParams.get("product_id") ?? undefined;
    const limitRaw = searchParams.get("limit");
    const limit = Math.min(Math.max(limitRaw ? parseInt(limitRaw, 10) : 50, 1), 100);
    const cursorRaw = searchParams.get("cursor");
    const offset = cursorRaw ? Math.max(0, parseInt(cursorRaw, 10)) : 0;

    const supabase = getServiceRoleClient();

    let query = supabase
      .from("product_reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === "pending") {
      query = query.eq("is_published", false).eq("is_example", false);
    } else if (status === "published") {
      query = query.eq("is_published", true).eq("is_example", false);
    } else if (status === "examples") {
      query = query.eq("is_example", true);
    }

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("[admin/reviews GET]", error);
      return NextResponse.json(
        { ok: false, code: "error", message: error.message },
        { status: 500 },
      );
    }

    const items = (rows ?? []).map((r: ReviewRow) => ({
      id: r.id,
      created_at: r.created_at,
      product_id: r.product_id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author_name: r.author_name,
      is_example: r.is_example,
      is_published: r.is_published,
      source: r.source,
      user_id: r.user_id,
      meta: r.meta ?? {},
    }));

    const nextCursor = items.length === limit ? String(offset + limit) : null;

    return NextResponse.json({ items, nextCursor });
  } catch (err) {
    console.error("[admin/reviews GET]", err);
    return NextResponse.json(
      { ok: false, code: "error", message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
