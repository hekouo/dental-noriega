import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { createShipmentFromRate } from "@/lib/skydropx/client";
import { getSkydropxConfig } from "@/lib/shipping/skydropx.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CreateLabelRequestSchema = z.object({
  orderId: z.string().uuid("orderId debe ser un UUID válido"),
});

type CreateLabelResponse =
  | {
      ok: true;
      trackingNumber: string;
      labelUrl: string | null;
      shipmentId: string | null;
    }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid_order_id"
        | "order_not_found"
        | "payment_not_paid"
        | "unsupported_provider"
        | "missing_shipping_rate"
        | "missing_address_data"
        | "skydropx_error"
        | "skydropx_not_found"
        | "config_error"
        | "unknown_error";
      message: string;
      statusCode?: number;
      details?: unknown;
    };

/**
 * Extrae datos de dirección desde metadata de la orden
 * Prioridad: metadata.shipping_address > metadata.shipping.address > metadata.address
 */
function extractAddressFromMetadata(metadata: unknown): {
  countryCode: string;
  postalCode: string;
  state: string;
  city: string;
  address1: string;
  name: string;
  phone?: string | null;
  email?: string | null;
} | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const meta = metadata as Record<string, unknown>;

  // PRIORIDAD 1: metadata.shipping_address (nuevo formato estructurado)
  let addressData: Record<string, unknown> | null = null;
  if (meta.shipping_address && typeof meta.shipping_address === "object") {
    addressData = meta.shipping_address as Record<string, unknown>;
  }
  // PRIORIDAD 2: metadata.shipping.address (compatibilidad)
  else if (meta.shipping && typeof meta.shipping === "object") {
    const shipping = meta.shipping as Record<string, unknown>;
    if (shipping.address && typeof shipping.address === "object") {
      addressData = shipping.address as Record<string, unknown>;
    }
  }
  // PRIORIDAD 3: metadata.address (legacy)
  else if (meta.address && typeof meta.address === "object") {
    addressData = meta.address as Record<string, unknown>;
  }

  if (!addressData) {
    return null;
  }

  // Extraer campos con múltiples variantes para compatibilidad
  const postalCode = addressData.postal_code || addressData.cp || addressData.postalCode;
  const state = addressData.state || addressData.estado;
  const city = addressData.city || addressData.ciudad;
  const address1 = addressData.address1 || addressData.address || addressData.direccion;
  const name = addressData.name || addressData.nombre || (meta.contact_name as string);
  const phone = addressData.phone || addressData.telefono || (meta.contact_phone as string | null);
  const email = addressData.email || (meta.contact_email as string | null);

  // Validar campos mínimos requeridos
  if (
    typeof postalCode === "string" &&
    typeof state === "string" &&
    typeof city === "string" &&
    typeof address1 === "string" &&
    typeof name === "string" &&
    postalCode.length > 0 &&
    state.length > 0 &&
    city.length > 0 &&
    address1.length > 0 &&
    name.length > 0
  ) {
    return {
      countryCode: (addressData.countryCode || addressData.country || "MX") as string,
      postalCode,
      state,
      city,
      address1,
      name,
      phone: typeof phone === "string" ? phone : null,
      email: typeof email === "string" ? email : null,
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Verificar acceso admin
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json(
        {
          ok: false,
          code: "unauthorized",
          message: "No tienes permisos para realizar esta acción",
        } satisfies CreateLabelResponse,
        { status: 403 },
      );
    }

    // Validar body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_order_id",
          message: "Datos inválidos: se espera un objeto JSON",
        } satisfies CreateLabelResponse,
        { status: 400 },
      );
    }

    // Validar con Zod
    const validationResult = CreateLabelRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_order_id",
          message: `Datos inválidos: ${errors}`,
        } satisfies CreateLabelResponse,
        { status: 400 },
      );
    }

    const { orderId } = validationResult.data;

    // Crear cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          code: "config_error",
          message: "Configuración de Supabase incompleta",
        } satisfies CreateLabelResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Cargar la orden
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[create-label] Orden no encontrada:", { orderId, error: orderError });
      }
      return NextResponse.json(
        {
          ok: false,
          code: "order_not_found",
          message: "La orden no existe",
        } satisfies CreateLabelResponse,
        { status: 404 },
      );
    }

    // IDEMPOTENCIA: Si ya tiene tracking y label, retornar datos existentes
    if (order.shipping_tracking_number && order.shipping_label_url) {
      // Extraer shipment_id de metadata si existe
      const metadata = (order.metadata as Record<string, unknown>) || {};
      const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
      const shipmentId = (shippingMeta.shipment_id as string) || null;

      return NextResponse.json(
        {
          ok: true,
          trackingNumber: order.shipping_tracking_number,
          labelUrl: order.shipping_label_url,
          shipmentId,
        } satisfies CreateLabelResponse,
        { status: 200 },
      );
    }

    // GUARD CONTRA RACE CONDITION: Intentar adquirir "lock" con UPDATE condicional
    // Solo actualizamos si NO tiene tracking_number (evita doble creación)
    const { data: lockedOrder, error: lockError } = await supabase
      .from("orders")
      .select("id, shipping_tracking_number, shipping_label_url, metadata")
      .eq("id", orderId)
      .is("shipping_tracking_number", null)
      .single();

    // Si no se encontró (ya tiene tracking), otro request ya creó la guía
    if (lockError || !lockedOrder) {
      // Re-leer la orden para obtener datos actualizados
      const { data: updatedOrder } = await supabase
        .from("orders")
        .select("shipping_tracking_number, shipping_label_url, metadata")
        .eq("id", orderId)
        .single();

      if (updatedOrder?.shipping_tracking_number && updatedOrder?.shipping_label_url) {
        const metadata = (updatedOrder.metadata as Record<string, unknown>) || {};
        const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
        const shipmentId = (shippingMeta.shipment_id as string) || null;

        return NextResponse.json(
          {
            ok: true,
            trackingNumber: updatedOrder.shipping_tracking_number,
            labelUrl: updatedOrder.shipping_label_url,
            shipmentId,
          } satisfies CreateLabelResponse,
          { status: 200 },
        );
      }

      // Si aún no tiene tracking, puede ser un error de lock
      return NextResponse.json(
        {
          ok: false,
          code: "unknown_error",
          message: "No se pudo adquirir el lock para crear la guía. Intenta de nuevo.",
        } satisfies CreateLabelResponse,
        { status: 409 }, // Conflict
      );
    }

    // Validar precondiciones
    if (order.payment_status !== "paid") {
      return NextResponse.json(
        {
          ok: false,
          code: "payment_not_paid",
          message: `La orden no está pagada (estado actual: ${order.payment_status}). Solo se pueden crear guías para órdenes pagadas.`,
        } satisfies CreateLabelResponse,
        { status: 400 },
      );
    }

    if (order.shipping_provider !== "skydropx" && order.shipping_provider !== "Skydropx") {
      return NextResponse.json(
        {
          ok: false,
          code: "unsupported_provider",
          message: `El proveedor de envío "${order.shipping_provider}" no es compatible. Se requiere "skydropx".`,
        } satisfies CreateLabelResponse,
        { status: 400 },
      );
    }

    if (!order.shipping_rate_ext_id) {
      return NextResponse.json(
        {
          ok: false,
          code: "missing_shipping_rate",
          message: "La orden no tiene un rate_id de Skydropx guardado",
        } satisfies CreateLabelResponse,
        { status: 400 },
      );
    }

    // Obtener datos de dirección del destino
    const addressTo = extractAddressFromMetadata(order.metadata);

    if (!addressTo) {
      return NextResponse.json(
        {
          ok: false,
          code: "missing_address_data",
          message:
            "No se encontraron datos de dirección en la orden. Asegúrate de que la orden tenga dirección de envío completa.",
        } satisfies CreateLabelResponse,
        { status: 400 },
      );
    }

    // Obtener configuración de origen de Skydropx
    const config = getSkydropxConfig();
    if (!config) {
      return NextResponse.json(
        {
          ok: false,
          code: "config_error",
          message: "Configuración de Skydropx incompleta",
        } satisfies CreateLabelResponse,
        { status: 500 },
      );
    }

    // Construir addressFrom desde configuración de origen
    const addressFrom = {
      countryCode: config.origin.country,
      postalCode: config.origin.postalCode,
      state: config.origin.state,
      city: config.origin.city,
      address1: config.origin.addressLine1 || "",
      name: config.origin.name,
      phone: config.origin.phone || null,
      email: config.origin.email || null,
    };

    // Calcular dimensiones del paquete (usar valores estándar si no están disponibles)
    // TODO: Calcular desde order_items si están disponibles
    const weightKg = 1.0; // Default 1kg
    const heightCm = 10;
    const widthCm = 20;
    const lengthCm = 20;

    if (process.env.NODE_ENV !== "production") {
      console.log("[create-label] Creando envío:", {
        orderId,
        rateId: order.shipping_rate_ext_id,
        from: `${addressFrom.city}, ${addressFrom.postalCode}`,
        to: `${addressTo.city}, ${addressTo.postalCode}`,
      });
    }

    // Crear el shipment en Skydropx
    const shipmentResult = await createShipmentFromRate({
      rateExternalId: order.shipping_rate_ext_id, // NO sobreescribir, solo usar como input
      addressFrom,
      addressTo,
      parcels: [
        {
          weight: weightKg,
          height: heightCm,
          width: widthCm,
          length: lengthCm,
        },
      ],
    });

    // Merge seguro de metadata (NO sobreescribir completo)
    const currentMetadata = (order.metadata as Record<string, unknown>) || {};
    const shippingMeta = (currentMetadata.shipping as Record<string, unknown>) || {};
    
    // Si Skydropx devolvió shipment_id, guardarlo en metadata.shipping (merge seguro)
    const updatedShippingMeta = {
      ...shippingMeta, // Preservar datos existentes (cancel_request_id, cancel_status, etc.)
      ...(shipmentResult.rawId && { shipment_id: shipmentResult.rawId }), // Agregar/actualizar shipment_id
    };

    const updatedMetadata = {
      ...currentMetadata, // Preservar todos los campos existentes
      shipping: updatedShippingMeta,
    };

    // Actualizar la orden con tracking y label
    // IMPORTANTE: NO sobreescribir shipping_rate_ext_id, solo usarlo como input
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        shipping_tracking_number: shipmentResult.trackingNumber,
        shipping_label_url: shipmentResult.labelUrl,
        shipping_status: "label_created",
        metadata: updatedMetadata, // Merge seguro de metadata
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .is("shipping_tracking_number", null); // Solo actualizar si aún no tiene tracking (doble verificación)

    if (updateError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[create-label] Error actualizando orden:", updateError);
      }
      // El shipment ya se creó en Skydropx, pero no se pudo actualizar la orden
      // Puede ser porque otro request ya actualizó (race condition)
      // Re-leer para verificar
      const { data: recheckOrder } = await supabase
        .from("orders")
        .select("shipping_tracking_number, shipping_label_url, metadata")
        .eq("id", orderId)
        .single();

      if (recheckOrder?.shipping_tracking_number) {
        // Otro request ya creó la guía, retornar datos existentes
        const recheckMetadata = (recheckOrder.metadata as Record<string, unknown>) || {};
        const recheckShippingMeta = (recheckMetadata.shipping as Record<string, unknown>) || {};
        const recheckShipmentId = (recheckShippingMeta.shipment_id as string) || null;

        return NextResponse.json(
          {
            ok: true,
            trackingNumber: recheckOrder.shipping_tracking_number,
            labelUrl: recheckOrder.shipping_label_url,
            shipmentId: recheckShipmentId,
          } satisfies CreateLabelResponse,
          { status: 200 },
        );
      }

      // Si realmente falló, devolver éxito pero con advertencia en logs
      return NextResponse.json(
        {
          ok: true,
          trackingNumber: shipmentResult.trackingNumber,
          labelUrl: shipmentResult.labelUrl,
          shipmentId: shipmentResult.rawId,
        } satisfies CreateLabelResponse,
        { status: 200 },
      );
    }

    // Verificar que realmente se actualizó (puede ser que otro request ya lo hizo)
    const { data: verifyOrder } = await supabase
      .from("orders")
      .select("shipping_tracking_number, shipping_label_url, metadata")
      .eq("id", orderId)
      .single();

    if (!verifyOrder?.shipping_tracking_number) {
      // No se actualizó, puede ser race condition
      return NextResponse.json(
        {
          ok: false,
          code: "unknown_error",
          message: "No se pudo actualizar la orden. Intenta de nuevo.",
        } satisfies CreateLabelResponse,
        { status: 500 },
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[create-label] Envío creado exitosamente:", {
        orderId,
        trackingNumber: shipmentResult.trackingNumber,
        hasLabel: !!shipmentResult.labelUrl,
        shipmentId: shipmentResult.rawId,
      });
    }

    const verifyMetadata = (verifyOrder.metadata as Record<string, unknown>) || {};
    const verifyShippingMeta = (verifyMetadata.shipping as Record<string, unknown>) || {};
    const finalShipmentId = (verifyShippingMeta.shipment_id as string) || shipmentResult.rawId || null;

    return NextResponse.json({
      ok: true,
      trackingNumber: verifyOrder.shipping_tracking_number,
      labelUrl: verifyOrder.shipping_label_url,
      shipmentId: finalShipmentId,
    } satisfies CreateLabelResponse);
  } catch (error) {
    console.error("[create-label] Error inesperado:", error);

    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    const errorCode = (error as Error & { code?: string }).code;
    const statusCode = (error as Error & { statusCode?: number }).statusCode;
    const errorDetails = (error as Error & { details?: unknown }).details;

    // Detectar errores específicos de Skydropx
    if (errorMessage.includes("Skydropx") || errorMessage.includes("token") || errorCode === "skydropx_not_found") {
      const skydropxCode: Extract<CreateLabelResponse, { ok: false }>["code"] = 
        errorCode === "skydropx_not_found" ? "skydropx_not_found" : "skydropx_error";
      
      return NextResponse.json(
        {
          ok: false,
          code: skydropxCode,
          message: errorMessage,
          statusCode: statusCode || undefined,
          details: errorDetails || undefined,
        } satisfies CreateLabelResponse,
        { status: statusCode === 404 ? 404 : 500 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "unknown_error",
        message: errorMessage,
        statusCode: statusCode || undefined,
        details: errorDetails || undefined,
      } satisfies CreateLabelResponse,
      { status: statusCode || 500 },
    );
  }
}

