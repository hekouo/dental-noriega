import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FeedbackRow = {
  id: string;
  created_at: string;
  page_path: string | null;
  type: string;
  message: string;
  rating: number | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  status: string;
  meta: Record<string, unknown>;
};

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * GET /api/admin/feedback
 * Query: status=new|reviewed|closed|spam|all, q?, limit?, cursor?
 * Response: { items: Feedback[], nextCursor: string|null }
 */
export async function GET(req: NextRequest): Promise<NextResponse<unknown>> {
  try {
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json({ ok: false, code: "unauthorized", message: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") ?? "new") as "new" | "reviewed" | "closed" | "spam" | "all";
    const q = searchParams.get("q")?.trim();
    const limitRaw = searchParams.get("limit");
    const limit = Math.min(Math.max(limitRaw ? parseInt(limitRaw, 10) : 50, 1), 100);
    const cursorRaw = searchParams.get("cursor");
    const offset = cursorRaw ? Math.max(0, parseInt(cursorRaw, 10)) : 0;

    const supabase = getServiceRoleClient();

    let query = supabase
      .from("site_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (q && q.length > 0) {
      const term = q.replace(/[%_\\]/g, "\\$&");
      query = query.or(`message.ilike.%${term}%,page_path.ilike.%${term}%`);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("[admin/feedback GET]", error);
      return NextResponse.json(
        { ok: false, code: "error", message: error.message },
        { status: 500 },
      );
    }

    const items = (rows ?? []).map((r: FeedbackRow) => ({
      id: r.id,
      created_at: r.created_at,
      page_path: r.page_path,
      type: r.type,
      message: r.message,
      rating: r.rating,
      email: r.email,
      phone: r.phone,
      user_id: r.user_id,
      status: r.status,
      meta: r.meta ?? {},
    }));

    const nextCursor = items.length === limit ? String(offset + limit) : null;

    return NextResponse.json({ items, nextCursor });
  } catch (err) {
    console.error("[admin/feedback GET]", err);
    return NextResponse.json(
      { ok: false, code: "error", message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
