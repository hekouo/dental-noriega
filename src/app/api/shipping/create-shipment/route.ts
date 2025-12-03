import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createShipmentFromRate } from "@/lib/skydropx/client";
import { getSkydropxConfig } from "@/lib/shipping/skydropx.server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Schema de validación para el request
const CreateShipmentRequestSchema = z.object({
  orderId: z.string().uuid("orderId debe ser un UUID válido"),
  // Datos de dirección opcionales (si no están en la orden)
  addressTo: z
    .object({
      countryCode: z.string().default("MX"),
      postalCode: z.string().min(5).max(10),
      state: z.string().min(1),
      city: z.string().min(1),
      address1: z.string().min(1),
      name: z.string().min(1),
      phone: z.string().optional().nullable(),
      email: z.string().email().optional().nullable(),
    })
    .optional(),
});

type CreateShipmentResponse =
  | {
      ok: true;
      orderId: string;
      trackingNumber: string;
      labelUrl: string | null;
    }
  | {
      ok: false;
      reason:
        | "invalid_order_id"
        | "order_not_found"
        | "unsupported_provider"
        | "missing_shipping_rate"
        | "missing_address_data"
        | "skydropx_error"
        | "unknown_error";
      message?: string;
    };

/**
 * Extrae datos de dirección desde metadata de la orden
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
  
  // Intentar obtener desde metadata.address o metadata.shipping.address
  const addressData = (meta.address as Record<string, unknown>) ||
    (meta.shipping && typeof meta.shipping === "object"
      ? (meta.shipping as Record<string, unknown>).address
      : null);

  if (!addressData || typeof addressData !== "object") {
    return null;
  }

  const addr = addressData as Record<string, unknown>;
  const postalCode = addr.cp || addr.postalCode || addr.postal_code;
  const state = addr.state || addr.estado;
  const city = addr.city || addr.ciudad;
  const address1 = addr.address || addr.address1 || addr.direccion;
  const name = addr.name || addr.nombre || meta.contact_name;
  const phone = addr.phone || addr.telefono || meta.contact_phone;
  const email = addr.email || meta.contact_email;

  if (
    typeof postalCode === "string" &&
    typeof state === "string" &&
    typeof city === "string" &&
    typeof address1 === "string" &&
    typeof name === "string"
  ) {
    return {
      countryCode: (addr.countryCode || addr.country || "MX") as string,
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
    // Verificar feature flag
    const enableSkydropx = process.env.ENABLE_SKYDROPX_SHIPPING !== "false";
    if (!enableSkydropx) {
      return NextResponse.json(
        {
          ok: false,
          reason: "unsupported_provider",
          message: "Skydropx shipping está deshabilitado",
        } satisfies CreateShipmentResponse,
        { status: 200 },
      );
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          ok: false,
          reason: "invalid_order_id",
          message: "Datos inválidos: se espera un objeto JSON",
        } satisfies CreateShipmentResponse,
        { status: 400 },
      );
    }

    // Validar con Zod
    const validationResult = CreateShipmentRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        {
          ok: false,
          reason: "invalid_order_id",
          message: `Datos inválidos: ${errors}`,
        } satisfies CreateShipmentResponse,
        { status: 400 },
      );
    }

    const { orderId, addressTo: addressToFromRequest } = validationResult.data;

    // Crear cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          reason: "unknown_error",
          message: "Configuración de Supabase incompleta",
        } satisfies CreateShipmentResponse,
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
        console.warn("[create-shipment] Orden no encontrada:", { orderId, error: orderError });
      }
      return NextResponse.json(
        {
          ok: false,
          reason: "order_not_found",
          message: "La orden no existe",
        } satisfies CreateShipmentResponse,
        { status: 404 },
      );
    }

    // Validar precondiciones
    if (order.shipping_provider !== "skydropx") {
      return NextResponse.json(
        {
          ok: false,
          reason: "unsupported_provider",
          message: `El proveedor de envío "${order.shipping_provider}" no es compatible. Se requiere "skydropx".`,
        } satisfies CreateShipmentResponse,
        { status: 400 },
      );
    }

    if (!order.shipping_rate_ext_id) {
      return NextResponse.json(
        {
          ok: false,
          reason: "missing_shipping_rate",
          message: "La orden no tiene un rate_id de Skydropx guardado",
        } satisfies CreateShipmentResponse,
        { status: 400 },
      );
    }

    // Obtener datos de dirección del destino
    let addressTo = addressToFromRequest;
    
    // Si no vienen en el request, intentar extraerlos de metadata
    if (!addressTo) {
      const addressFromMeta = extractAddressFromMetadata(order.metadata);
      if (addressFromMeta) {
        addressTo = addressFromMeta;
      }
    }

    // Si aún no tenemos dirección, usar campos directos de la orden como fallback
    if (!addressTo) {
      // Intentar construir desde pickup_location (formato: "direccion, colonia, estado CP")
      if (order.pickup_location && order.contact_name) {
        const parts = order.pickup_location.split(",");
        if (parts.length >= 3) {
          const cpMatch = parts[parts.length - 1].trim().match(/(\d{5})/);
          const postalCode = cpMatch ? cpMatch[1] : "";
          const state = parts[parts.length - 2]?.trim() || "";
          const city = parts[parts.length - 2]?.trim() || ""; // Aproximación
          const address1 = parts[0]?.trim() || "";

          if (postalCode && state && address1) {
            addressTo = {
              countryCode: "MX",
              postalCode,
              state,
              city,
              address1,
              name: order.contact_name,
              phone: order.contact_phone,
              email: order.contact_email,
            };
          }
        }
      }
    }

    if (!addressTo) {
      return NextResponse.json(
        {
          ok: false,
          reason: "missing_address_data",
          message:
            "No se encontraron datos de dirección. Proporciónalos en el request o asegúrate de que estén en metadata de la orden.",
        } satisfies CreateShipmentResponse,
        { status: 400 },
      );
    }

    // Obtener configuración de origen de Skydropx
    const config = getSkydropxConfig();
    if (!config) {
      return NextResponse.json(
        {
          ok: false,
          reason: "skydropx_error",
          message: "Configuración de Skydropx incompleta",
        } satisfies CreateShipmentResponse,
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
    // Estos valores deberían venir de los items de la orden, pero por ahora usamos defaults
    const weightKg = 1.0; // Default 1kg, idealmente calcular desde order_items
    const heightCm = 10;
    const widthCm = 20;
    const lengthCm = 20;

    if (process.env.NODE_ENV !== "production") {
      console.log("[create-shipment] Creando envío:", {
        orderId,
        rateId: order.shipping_rate_ext_id,
        from: `${addressFrom.city}, ${addressFrom.postalCode}`,
        to: `${addressTo.city}, ${addressTo.postalCode}`,
      });
    }

    // Crear el shipment en Skydropx
    const shipmentResult = await createShipmentFromRate({
      rateExternalId: order.shipping_rate_ext_id,
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

    // Actualizar la orden con tracking y label
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        shipping_tracking_number: shipmentResult.trackingNumber,
        shipping_label_url: shipmentResult.labelUrl,
        shipping_status: "created",
      })
      .eq("id", orderId);

    if (updateError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[create-shipment] Error actualizando orden:", updateError);
      }
      // El shipment ya se creó en Skydropx, pero no se pudo actualizar la orden
      // Devolver éxito pero con advertencia
      return NextResponse.json(
        {
          ok: true,
          orderId,
          trackingNumber: shipmentResult.trackingNumber,
          labelUrl: shipmentResult.labelUrl,
        } satisfies CreateShipmentResponse,
        { status: 200 },
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[create-shipment] Envío creado exitosamente:", {
        orderId,
        trackingNumber: shipmentResult.trackingNumber,
        hasLabel: !!shipmentResult.labelUrl,
      });
    }

    return NextResponse.json({
      ok: true,
      orderId,
      trackingNumber: shipmentResult.trackingNumber,
      labelUrl: shipmentResult.labelUrl,
    } satisfies CreateShipmentResponse);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[create-shipment] Error inesperado:", error);
    }

    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    
    // Detectar errores específicos de Skydropx
    if (errorMessage.includes("Skydropx") || errorMessage.includes("token")) {
      return NextResponse.json(
        {
          ok: false,
          reason: "skydropx_error",
          message: errorMessage,
        } satisfies CreateShipmentResponse,
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        reason: "unknown_error",
        message: errorMessage,
      } satisfies CreateShipmentResponse,
      { status: 500 },
    );
  }
}
