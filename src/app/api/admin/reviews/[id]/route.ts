import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * PATCH /api/admin/reviews/[id]
 * Body: { is_published: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<unknown>> {
  try {
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json({ ok: false, code: "unauthorized", message: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, code: "bad_request", message: "id requerido" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.is_published !== "boolean") {
      return NextResponse.json(
        { ok: false, code: "bad_request", message: "Body debe incluir is_published (boolean)" },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("product_reviews")
      .update({ is_published: body.is_published })
      .eq("id", id)
      .select("id, is_published")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ ok: false, code: "not_found", message: "Reseña no encontrada" }, { status: 404 });
      }
      console.error("[admin/reviews PATCH]", error);
      return NextResponse.json({ ok: false, code: "error", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, review: data });
  } catch (err) {
    console.error("[admin/reviews PATCH]", err);
    return NextResponse.json(
      { ok: false, code: "error", message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/reviews/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<unknown>> {
  try {
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json({ ok: false, code: "unauthorized", message: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, code: "bad_request", message: "id requerido" }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);

    if (error) {
      console.error("[admin/reviews DELETE]", error);
      return NextResponse.json({ ok: false, code: "error", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/reviews DELETE]", err);
    return NextResponse.json(
      { ok: false, code: "error", message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
