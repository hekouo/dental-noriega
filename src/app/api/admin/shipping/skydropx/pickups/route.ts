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
type JsonErr = {
  ok: false;
  message: string;
  skydropx_status?: number;
  skydropx_url_used?: string;
  skydropx_response_sample?: string;
  attempts?: Array<{ url: string; status: number; message: string }>;
};

type PickupAttemptConfig = {
  url: string;
  path: string;
  target: "app" | "pro" | "api-pro";
};

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

function safeTruncate(value: unknown, max = 280): string {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? {});
  const safe = sanitizeForLog(raw);
  return safe.length > max ? `${safe.slice(0, max)}...` : safe;
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
  const referenceShipmentId = shipmentIdFromMeta ?? undefined;
  if (!shipmentId) {
    return NextResponse.json(
      { ok: false, message: "No hay shipment_id. Primero crea la guía." },
      { status: 400 },
    );
  }

  const payload = {
    pickup: {
      shipment_id: shipmentId,
      ...(referenceShipmentId ? { reference_shipment_id: referenceShipmentId } : {}),
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

  const pickupAttemptsConfig: PickupAttemptConfig[] = [
    {
      url: "https://app.skydropx.com/api/v1/pickups/",
      path: "/api/v1/pickups/",
      target: "app",
    },
    {
      url: "https://app.skydropx.com/api/v1/pickups",
      path: "/api/v1/pickups",
      target: "app",
    },
    {
      url: "https://pro.skydropx.com/api/v1/pickups/",
      path: "/api/v1/pickups/",
      target: "pro",
    },
    {
      url: "https://pro.skydropx.com/api/v1/pickups",
      path: "/api/v1/pickups",
      target: "pro",
    },
    {
      url: "https://api-pro.skydropx.com/api/v1/pickups/",
      path: "/api/v1/pickups/",
      target: "api-pro",
    },
    {
      url: "https://api-pro.skydropx.com/api/v1/pickups",
      path: "/api/v1/pickups",
      target: "api-pro",
    },
  ];
  let pickupJson: Record<string, unknown> = {};
  let endpointUsed: string | null = null;
  const attempts: Array<{ url: string; status: number; message: string }> = [];
  let currentAttemptUrl = pickupAttemptsConfig[0].url;
  try {
    for (const attempt of pickupAttemptsConfig) {
      currentAttemptUrl = attempt.url;
      const res = await skydropxFetch(
        attempt.path,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        attempt.target,
      );
      pickupJson = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const msg =
        typeof pickupJson.message === "string"
          ? pickupJson.message
          : typeof pickupJson.error === "string"
            ? pickupJson.error
            : "Error Skydropx al crear pickup";

      if (res.ok) {
        endpointUsed = attempt.url;
        break;
      }

      attempts.push({
        url: attempt.url,
        status: res.status,
        message: safeTruncate(msg),
      });
      console.error("[admin/pickups] skydropx !ok", {
        status: res.status,
        url: attempt.url,
        message: sanitizeForLog(msg),
      });
    }

    if (!endpointUsed) {
      const lastAttempt = attempts[attempts.length - 1];
      const status =
        lastAttempt && lastAttempt.status >= 400 && lastAttempt.status < 600 ? lastAttempt.status : 502;
      return NextResponse.json(
        {
          ok: false,
          message: lastAttempt?.message ?? "Error Skydropx al crear pickup",
          skydropx_status: lastAttempt?.status ?? 502,
          skydropx_url_used: lastAttempt?.url ?? pickupAttemptsConfig[0].url,
          skydropx_response_sample: safeTruncate(pickupJson),
          attempts,
        },
        { status },
      );
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? sanitizeForLog(err.message) : "unknown";
    attempts.push({
      url: currentAttemptUrl,
      status: 502,
      message: safeTruncate(errorMessage),
    });
    console.error("[admin/pickups] skydropx", {
      attempts,
      error: errorMessage,
    });
    return NextResponse.json(
      {
        ok: false,
        message: "Error Skydropx al crear pickup",
        skydropx_status: 502,
        skydropx_url_used: attempts[attempts.length - 1]?.url ?? pickupAttemptsConfig[0].url,
        skydropx_response_sample: safeTruncate(errorMessage),
        attempts,
      },
      { status: 502 },
    );
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
      endpoint_used: endpointUsed ?? null,
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

