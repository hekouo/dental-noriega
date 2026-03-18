import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { sanitizeForLog } from "@/lib/utils/sanitizeForLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ShippingHandoffPatchSchema = z.object({
  mode: z.literal("dropoff").optional(),
  selected_at: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  dropoff: z
    .object({
      status: z.enum(["pending_dropoff", "dropped_off"]).optional(),
      location_name: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      dropped_off_at: z.string().datetime().optional().nullable(),
    })
    .optional(),
});

const PatchBodySchema = z.object({
  shipping_handoff_patch: ShippingHandoffPatchSchema,
});

type JsonOk = { ok: true };
type JsonErr = { ok: false; message: string };

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  patch: Record<string, unknown>,
): T {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof out[k] === "object" &&
      out[k] !== null &&
      !Array.isArray(out[k])
    ) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

/**
 * PATCH /api/admin/orders/[id]/metadata
 * body: { shipping_handoff_patch: {...} }
 *
 * Merge profundo SOLO en metadata.shipping.handoff (no sobrescribe todo metadata.shipping).
 * Auth: checkAdminAccess()
 * Supabase: service role
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<JsonOk | JsonErr>> {
  const access = await checkAdminAccess();
  if (access.status !== "allowed") {
    return NextResponse.json({ ok: false, message: "Acceso denegado" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ ok: false, message: "ID de orden inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.errors[0]?.message ?? "Parámetros inválidos" },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[orders/metadata] Configuración de Supabase incompleta");
    return NextResponse.json({ ok: false, message: "Configuración incompleta" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, metadata")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("[orders/metadata] Error al obtener orden:", sanitizeForLog(fetchError.message));
    return NextResponse.json({ ok: false, message: "Error al consultar orden" }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ ok: false, message: "Orden no encontrada" }, { status: 404 });
  }

  const meta = (order.metadata ?? null) as Record<string, unknown> | null;
  const shipping = (meta?.shipping && typeof meta.shipping === "object" ? meta.shipping : {}) as Record<
    string,
    unknown
  >;
  const handoffBase =
    shipping.handoff && typeof shipping.handoff === "object"
      ? (shipping.handoff as Record<string, unknown>)
      : {};

  const handoffNext = deepMerge(handoffBase, parsed.data.shipping_handoff_patch as unknown as Record<string, unknown>);
  const shippingNext = { ...shipping, handoff: handoffNext };
  const metaNext = { ...(meta ?? {}), shipping: shippingNext };

  const { error: updateError } = await supabase
    .from("orders")
    .update({ metadata: metaNext })
    .eq("id", id);

  if (updateError) {
    console.error("[orders/metadata] Error al actualizar orden:", sanitizeForLog(updateError.message));
    return NextResponse.json({ ok: false, message: "Error al actualizar orden" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

