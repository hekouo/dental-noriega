import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { sanitizeForLog } from "@/lib/utils/sanitizeForLog";
import { skydropxFetch } from "@/lib/skydropx/client";
import { getPickupOrigin } from "@/lib/shipping/pickupOrigin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BodySchema = z.object({
  orderId: z.string().uuid(),
  scheduled_from: z.string().datetime(),
  scheduled_to: z.string().datetime(),
  packages: z.number().int().min(1).max(99),
  total_weight_kg: z.number().positive().max(300),
  notes: z.string().optional().nullable(),
});

type JsonOk = {
  ok: true;
  pickup_id: string;
  scheduled_from: string;
  scheduled_to: string;
  packages: number;
  total_weight_kg: number;
};
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

export async function POST(req: NextRequest): Promise<NextResponse<JsonOk | JsonErr>> {
  const access = await checkAdminAccess();
  if (access.status !== "allowed") {
    return NextResponse.json({ ok: false, message: "Acceso denegado" }, { status: 403 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.errors[0]?.message ?? "Body inválido" },
      { status: 400 },
    );
  }

  const { orderId, scheduled_from, scheduled_to, packages, total_weight_kg, notes } = parsed.data;
  const fromDate = new Date(scheduled_from);
  const toDate = new Date(scheduled_to);
  if (toDate.getTime() <= fromDate.getTime()) {
    return NextResponse.json(
      { ok: false, message: "El horario final debe ser mayor al inicial." },
      { status: 400 },
    );
  }
  if (fromDate.getUTCDay() === 0) {
    return NextResponse.json({ ok: false, message: "Domingo no disponible" }, { status: 400 });
  }

  const originCfg = getPickupOrigin();
  if (!originCfg.ok) {
    return NextResponse.json({ ok: false, message: originCfg.reason }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, message: "Configuración incompleta" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, metadata, shipping_shipment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) {
    console.error("[admin/pickups] order fetch", sanitizeForLog(orderError.message));
    return NextResponse.json({ ok: false, message: "Error al consultar orden" }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ ok: false, message: "Orden no encontrada" }, { status: 404 });
  }

  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  const shipping = (meta.shipping ?? {}) as Record<string, unknown>;
  const handoff = (shipping.handoff ?? {}) as Record<string, unknown>;
  const pickup = (handoff.pickup ?? {}) as Record<string, unknown>;
  if (typeof pickup.pickup_id === "string" && pickup.pickup_id.trim()) {
    return NextResponse.json({ ok: false, message: "Pickup ya programado" }, { status: 409 });
  }

  const shipmentIdFromMeta =
    shipping && typeof shipping === "object" ? (shipping.shipment_id as string | undefined) : undefined;
  const shipmentId = (order.shipping_shipment_id as string | null) || shipmentIdFromMeta || null;
  if (!shipmentId) {
    return NextResponse.json(
      { ok: false, message: "No hay shipment_id. Primero crea la guía." },
      { status: 400 },
    );
  }

  const payload = {
    pickup: {
      shipment_id: shipmentId,
      scheduled_from,
      scheduled_to,
      packages,
      total_weight: total_weight_kg,
      comments: notes ?? "",
      address_from: {
        name: originCfg.origin.name,
        phone: originCfg.origin.phone,
        email: originCfg.origin.email,
        country: originCfg.origin.country,
        zip: originCfg.origin.postal_code,
        state: originCfg.origin.state,
        city: originCfg.origin.city,
        street1: originCfg.origin.address1,
        address1: originCfg.origin.address1,
        address2: originCfg.origin.address2,
      },
    },
  };

  let pickupJson: Record<string, unknown> = {};
  try {
    const res = await skydropxFetch("/api/v1/pickups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    pickupJson = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg = typeof pickupJson.message === "string" ? pickupJson.message : "Error Skydropx al crear pickup";
      return NextResponse.json({ ok: false, message: msg }, { status: 502 });
    }
  } catch (err) {
    console.error("[admin/pickups] skydropx", err);
    return NextResponse.json({ ok: false, message: "Error Skydropx al crear pickup" }, { status: 502 });
  }

  const pickupId =
    (pickupJson.id as string | undefined) ||
    ((pickupJson.data as Record<string, unknown> | undefined)?.id as string | undefined) ||
    ((pickupJson.pickup as Record<string, unknown> | undefined)?.id as string | undefined) ||
    "";
  if (!pickupId) {
    return NextResponse.json({ ok: false, message: "Skydropx no devolvió pickup_id" }, { status: 502 });
  }

  const now = new Date().toISOString();
  const handoffPatch = {
    mode: "pickup",
    selected_at: now,
    notes: notes ?? null,
    pickup: {
      pickup_id: pickupId,
      scheduled_from,
      scheduled_to,
      packages,
      total_weight_kg,
      status: "scheduled",
      raw: pickupJson,
    },
  };
  const nextHandoff = deepMerge(handoff, handoffPatch as unknown as Record<string, unknown>);
  const nextMeta = {
    ...meta,
    shipping: {
      ...shipping,
      handoff: nextHandoff,
    },
  };

  const { error: updateError } = await supabase
    .from("orders")
    .update({ metadata: nextMeta })
    .eq("id", orderId);
  if (updateError) {
    console.error("[admin/pickups] update", sanitizeForLog(updateError.message));
    return NextResponse.json({ ok: false, message: "Pickup creado pero no se pudo persistir metadata" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    pickup_id: pickupId,
    scheduled_from,
    scheduled_to,
    packages,
    total_weight_kg,
  });
}

