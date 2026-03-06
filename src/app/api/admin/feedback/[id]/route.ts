import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_STATUSES = ["new", "reviewed", "closed", "spam"] as const;

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * PATCH /api/admin/feedback/[id]
 * Body: { status: "new"|"reviewed"|"closed"|"spam" }
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
    if (!body || typeof body.status !== "string" || !ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { ok: false, code: "bad_request", message: "Body debe incluir status: new|reviewed|closed|spam" },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("site_feedback")
      .update({ status: body.status })
      .eq("id", id)
      .select("id, status")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ ok: false, code: "not_found", message: "Feedback no encontrado" }, { status: 404 });
      }
      console.error("[admin/feedback PATCH]", error);
      return NextResponse.json({ ok: false, code: "error", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, feedback: data });
  } catch (err) {
    console.error("[admin/feedback PATCH]", err);
    return NextResponse.json(
      { ok: false, code: "error", message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/feedback/[id]
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
    const { error } = await supabase.from("site_feedback").delete().eq("id", id);

    if (error) {
      console.error("[admin/feedback DELETE]", error);
      return NextResponse.json({ ok: false, code: "error", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/feedback DELETE]", err);
    return NextResponse.json(
      { ok: false, code: "error", message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
