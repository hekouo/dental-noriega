import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { createShipmentFromRate, getShipment } from "@/lib/skydropx/client";
import { getSkydropxConfig } from "@/lib/shipping/skydropx.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CreateLabelRequestSchema = z.object({
  orderId: z.string().uuid("orderId debe ser un UUID válido"),
});

type CreateLabelResponse =
  | {
      ok: true;
      trackingNumber: string | null;
      labelUrl: string | null;
      shipmentId: string | null;
      trackingPending?: boolean;
      pollingInfo?: {
        attempts: number;
        elapsedMs: number;
      };
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
        | "missing_final_package"
        | "skydropx_error"
        | "skydropx_not_found"
        | "skydropx_oauth_failed"
        | "skydropx_unauthorized"
        | "skydropx_bad_request"
        | "skydropx_unprocessable_entity"
        | "invalid_shipping_payload"
        | "config_error"
        | "tracking_pending"
        | "unknown_error";
      message: string;
      statusCode?: number;
      details?: unknown;
      shipmentId?: string | null;
      pollingInfo?: {
        attempts: number;
        elapsedMs: number;
      };
    };

/**
 * Extrae datos de dirección desde metadata de la orden
 * Prioridad:
 * 1) metadata.shipping_address_override
 * 2) metadata.shipping_address
 * 3) metadata.shipping.address
 * 4) metadata.address
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

  // PRIORIDAD 1: metadata.shipping_address_override (override manual en admin)
  let addressData: Record<string, unknown> | null = null;
  if (meta.shipping_address_override && typeof meta.shipping_address_override === "object") {
    addressData = meta.shipping_address_override as Record<string, unknown>;
  }
  // PRIORIDAD 2: metadata.shipping_address (nuevo formato estructurado)
  else if (meta.shipping_address && typeof meta.shipping_address === "object") {
    addressData = meta.shipping_address as Record<string, unknown>;
  }
  // PRIORIDAD 3: metadata.shipping.address (compatibilidad)
  else if (meta.shipping && typeof meta.shipping === "object") {
    const shipping = meta.shipping as Record<string, unknown>;
    if (shipping.address && typeof shipping.address === "object") {
      addressData = shipping.address as Record<string, unknown>;
    }
  }
  // PRIORIDAD 4: metadata.address (legacy)
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
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
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
    
    const order = orderData;

    // IDEMPOTENCIA: Verificar si ya existe shipment_id en metadata
    const orderMetadata = (order.metadata as Record<string, unknown>) || {};
    const orderShippingMeta = (orderMetadata.shipping as Record<string, unknown>) || {};
    const existingShipmentId = (orderShippingMeta.shipment_id as string) || null;

    // Si ya tiene tracking y label completos, retornar datos existentes
    if (order.shipping_tracking_number && order.shipping_label_url) {
      return NextResponse.json(
        {
          ok: true,
          trackingNumber: order.shipping_tracking_number,
          labelUrl: order.shipping_label_url,
          shipmentId: existingShipmentId,
        } satisfies CreateLabelResponse,
        { status: 200 },
      );
    }

    // Si existe shipment_id pero no tiene tracking/label completo, intentar rehidratar
    if (existingShipmentId) {
      try {
        const shipmentResponse = await getShipment(existingShipmentId);
        
        // Extraer tracking y label usando las mismas funciones tolerantes
        const anyResponse = shipmentResponse as any;
        const trackingNumber =
          shipmentResponse.master_tracking_number ||
          shipmentResponse.data?.master_tracking_number ||
          (shipmentResponse as any).tracking_number ||
          (shipmentResponse.data as any)?.tracking_number ||
          (shipmentResponse as any).tracking ||
          (shipmentResponse.included && Array.isArray(shipmentResponse.included)
            ? shipmentResponse.included.find((pkg: any) => (pkg as any).tracking_number)?.tracking_number
            : null) ||
          anyResponse.shipment?.tracking_number ||
          anyResponse.shipment?.master_tracking_number ||
          null;

        let labelUrl: string | null = null;
        if (shipmentResponse.included && Array.isArray(shipmentResponse.included)) {
          const firstPackage = shipmentResponse.included.find((pkg: any) => pkg.label_url);
          if (firstPackage?.label_url) {
            labelUrl = firstPackage.label_url;
          }
        }
        if (!labelUrl) {
          labelUrl =
            (shipmentResponse as any).label_url ||
            (shipmentResponse.data as any)?.label_url ||
            (shipmentResponse as any).label_url_pdf ||
            anyResponse.files?.label ||
            anyResponse.shipment?.label_url ||
            null;
        }

        // Si ahora tenemos tracking y label, actualizar la orden
        if (trackingNumber || labelUrl) {
          const updatedShippingMeta = {
            ...orderShippingMeta,
            shipment_id: existingShipmentId,
          };
          const updatedMetadata = {
            ...orderMetadata,
            shipping: updatedShippingMeta,
          };

          const updateData: Record<string, unknown> = {
            metadata: updatedMetadata,
            updated_at: new Date().toISOString(),
          };

          if (trackingNumber && !order.shipping_tracking_number) {
            updateData.shipping_tracking_number = trackingNumber;
          }
          if (labelUrl && !order.shipping_label_url) {
            updateData.shipping_label_url = labelUrl;
          }

          if (trackingNumber && labelUrl) {
            updateData.shipping_status = "label_created";
          } else if (trackingNumber || labelUrl) {
            updateData.shipping_status = "label_pending_tracking";
          }

          await supabase.from("orders").update(updateData).eq("id", orderId);

          return NextResponse.json(
            {
              ok: true,
              trackingNumber: trackingNumber || order.shipping_tracking_number || null,
              labelUrl: labelUrl || order.shipping_label_url || null,
              shipmentId: existingShipmentId,
              trackingPending: !trackingNumber || !labelUrl,
            } satisfies CreateLabelResponse,
            { status: 200 },
          );
        }

        // Si aún no tiene tracking/label, continuar con la creación normal
        // (pero no crear otro shipment, solo retornar tracking_pending)
        if (!trackingNumber && !labelUrl) {
          return NextResponse.json(
            {
              ok: false,
              code: "tracking_pending",
              message: "El envío fue creado en Skydropx pero el tracking/label aún no está disponible. Reintenta en unos momentos.",
              shipmentId: existingShipmentId,
            } satisfies CreateLabelResponse,
            { status: 202 }, // Accepted (procesando)
          );
        }
      } catch (syncError) {
        // Si falla la rehidratación, continuar con creación normal
        if (process.env.NODE_ENV !== "production") {
          console.warn("[create-label] Error al rehidratar shipment existente:", syncError);
        }
        // Continuar con la creación normal
      }
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

    // VALIDACIONES LOCALES 422 antes de llamar a Skydropx
    const missingFields: string[] = [];
    
    // Validar rate_id
    if (!order.shipping_rate_ext_id || typeof order.shipping_rate_ext_id !== "string" || order.shipping_rate_ext_id.trim() === "") {
      missingFields.push("rate_id");
    }
    
    // Validar address_from required
    if (!addressFrom.address1 || addressFrom.address1.trim() === "") {
      missingFields.push("address_from.street1");
    }
    if (!addressFrom.name || addressFrom.name.trim() === "") {
      missingFields.push("address_from.name");
    }
    if (!config.origin.postalCode || config.origin.postalCode.trim() === "") {
      missingFields.push("address_from.zip");
    }
    if (!config.origin.city || config.origin.city.trim() === "") {
      missingFields.push("address_from.city");
    }
    if (!config.origin.state || config.origin.state.trim() === "") {
      missingFields.push("address_from.state");
    }
    
    // Validar address_to required
    if (!addressTo.address1 || addressTo.address1.trim() === "") {
      missingFields.push("address_to.street1");
    }
    if (!addressTo.name || addressTo.name.trim() === "") {
      missingFields.push("address_to.name");
    }
    if (!addressTo.postalCode || addressTo.postalCode.trim() === "") {
      missingFields.push("address_to.zip");
    }
    if (!addressTo.city || addressTo.city.trim() === "") {
      missingFields.push("address_to.city");
    }
    if (!addressTo.state || addressTo.state.trim() === "") {
      missingFields.push("address_to.state");
    }
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_shipping_payload",
          message: `Faltan campos requeridos para crear el envío: ${missingFields.join(", ")}`,
          details: {
            missingFields,
          },
        } satisfies CreateLabelResponse,
        { status: 422 },
      );
    }

    // Extraer consignment_note y package_type desde metadata o env vars
    const packageMetadata = (order.metadata as Record<string, unknown>) || {};
    const packageShippingMeta = (packageMetadata.shipping as Record<string, unknown>) || {};
    
    // Intentar obtener desde metadata.shipping.consignment_note o metadata.shipping.consignment_note_code
    const consignmentNoteFromMeta = 
      (typeof packageShippingMeta.consignment_note === "string" ? packageShippingMeta.consignment_note : null) ||
      (typeof packageShippingMeta.consignment_note_code === "string" ? packageShippingMeta.consignment_note_code : null);
    
    // Intentar obtener package_type desde metadata (menos común)
    const packageTypeFromMeta = typeof packageShippingMeta.package_type === "string" ? packageShippingMeta.package_type : null;
    
    // Fallback a env vars
    const consignmentNote = consignmentNoteFromMeta || process.env.SKYDROPX_DEFAULT_CONSIGNMENT_NOTE || null;
    const packageType = packageTypeFromMeta || process.env.SKYDROPX_DEFAULT_PACKAGE_TYPE || null;
    
    // Validar que existan antes de llamar a Skydropx
    if (!consignmentNote || consignmentNote.trim() === "") {
      missingFields.push("packages[].consignment_note");
    }
    if (!packageType || packageType.trim() === "") {
      missingFields.push("packages[].package_type");
    }
    
    // Si faltan, responder 422 local (ya validado arriba, pero re-check para estos campos)
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_shipping_payload",
          message: `Faltan campos requeridos para crear el envío: ${missingFields.join(", ")}`,
          details: {
            missingFields,
          },
        } satisfies CreateLabelResponse,
        { status: 422 },
      );
    }

    // Obtener shipping_package_final (paquete real capturado por admin)
    const shippingPackageFinal = packageMetadata.shipping_package_final as
      | {
          weight_g?: number;
          length_cm?: number;
          width_cm?: number;
          height_cm?: number;
          mode?: string;
          updated_at?: string;
        }
      | undefined;

    // Obtener paquete estimado (checkout) como fallback
    const shippingPackageEstimated =
      (packageMetadata.shipping_package_estimated as
        | {
            weight_g?: number;
            length_cm?: number;
            width_cm?: number;
            height_cm?: number;
          }
        | undefined) ||
      ((packageShippingMeta.estimated_package as
        | {
            weight_g?: number;
            length_cm?: number;
            width_cm?: number;
            height_cm?: number;
          }
        | undefined) ?? undefined);

    const DEFAULT_PACKAGE = {
      weight_g: 1200,
      length_cm: 20,
      width_cm: 20,
      height_cm: 10,
    };

    const isValidDimension = (value: unknown): value is number =>
      typeof value === "number" && value > 0;

    let packageSource: "final" | "estimated" | "default" = "default";
    let weightG = DEFAULT_PACKAGE.weight_g;
    let lengthCm = DEFAULT_PACKAGE.length_cm;
    let widthCm = DEFAULT_PACKAGE.width_cm;
    let heightCm = DEFAULT_PACKAGE.height_cm;

    if (
      shippingPackageFinal &&
      isValidDimension(shippingPackageFinal.weight_g) &&
      isValidDimension(shippingPackageFinal.length_cm) &&
      isValidDimension(shippingPackageFinal.width_cm) &&
      isValidDimension(shippingPackageFinal.height_cm)
    ) {
      packageSource = "final";
      weightG = shippingPackageFinal.weight_g;
      lengthCm = shippingPackageFinal.length_cm;
      widthCm = shippingPackageFinal.width_cm;
      heightCm = shippingPackageFinal.height_cm;
    } else if (
      shippingPackageEstimated &&
      isValidDimension(shippingPackageEstimated.weight_g)
    ) {
      packageSource = "estimated";
      weightG = shippingPackageEstimated.weight_g;
      lengthCm = isValidDimension(shippingPackageEstimated.length_cm)
        ? shippingPackageEstimated.length_cm
        : DEFAULT_PACKAGE.length_cm;
      widthCm = isValidDimension(shippingPackageEstimated.width_cm)
        ? shippingPackageEstimated.width_cm
        : DEFAULT_PACKAGE.width_cm;
      heightCm = isValidDimension(shippingPackageEstimated.height_cm)
        ? shippingPackageEstimated.height_cm
        : DEFAULT_PACKAGE.height_cm;
    }

    // Convertir peso a kg
    const weightKg = weightG / 1000;

    if (process.env.NODE_ENV !== "production") {
      console.log("[create-label] Creando envío:", {
        orderId,
        rateId: order.shipping_rate_ext_id,
        from: `${addressFrom.city}, ${addressFrom.postalCode}`,
        to: `${addressTo.city}, ${addressTo.postalCode}`,
        hasConsignmentNote: !!consignmentNote,
        hasPackageType: !!packageType,
        package: {
          source: packageSource,
          weightKg,
          lengthCm,
          widthCm,
          heightCm,
        },
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
      consignmentNote: consignmentNote!, // Ya validado arriba
      packageType: packageType!, // Ya validado arriba
    });

    // Merge seguro de metadata (NO sobreescribir completo)
    const finalMetadata = (order.metadata as Record<string, unknown>) || {};
    const finalShippingMeta = (finalMetadata.shipping as Record<string, unknown>) || {};
    
    // IMPORTANTE: SIEMPRE guardar shipment_id en metadata, incluso si tracking está pendiente
    // Esto permite cancelar el envío después aunque tracking no esté disponible inmediatamente
    const updatedShippingMeta = {
      ...finalShippingMeta, // Preservar datos existentes (cancel_request_id, cancel_status, etc.)
      shipment_id: shipmentResult.rawId || finalShippingMeta.shipment_id || null, // SIEMPRE guardar/actualizar shipment_id
    };

    const updatedMetadata = {
      ...finalMetadata, // Preservar todos los campos existentes
      shipping: updatedShippingMeta,
    };

    // Determinar shipping_status según disponibilidad de tracking/label
    let shippingStatus: string;
    if (shipmentResult.trackingNumber && shipmentResult.labelUrl) {
      shippingStatus = "label_created";
    } else if (shipmentResult.trackingNumber || shipmentResult.labelUrl) {
      shippingStatus = "label_pending_tracking";
    } else {
      shippingStatus = "label_pending_tracking"; // Si no hay ninguno, está pendiente
    }

    // Actualizar la orden con tracking y label (si están disponibles)
    // IMPORTANTE: SIEMPRE guardar shipment_id en metadata Y columna shipping_shipment_id
    const shipmentIdToSave = shipmentResult.rawId || finalShippingMeta.shipment_id || null;
    const updateData: Record<string, unknown> = {
      metadata: updatedMetadata, // Merge seguro de metadata (incluye shipment_id SIEMPRE)
      shipping_status: shippingStatus,
      updated_at: new Date().toISOString(),
    };

    // Guardar shipment_id en columna dedicada para matching confiable en webhooks
    if (shipmentIdToSave) {
      updateData.shipping_shipment_id = shipmentIdToSave;
    }

    // Solo actualizar tracking/label si están disponibles (no null)
    if (shipmentResult.trackingNumber) {
      updateData.shipping_tracking_number = shipmentResult.trackingNumber;
    }
    if (shipmentResult.labelUrl) {
      updateData.shipping_label_url = shipmentResult.labelUrl;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .is("shipping_tracking_number", null); // Solo actualizar si aún no tiene tracking (doble verificación)

    // Enviar email de envío generado si se actualizó exitosamente y hay tracking/label
    if (!updateError && (shipmentResult.trackingNumber || shipmentResult.labelUrl)) {
      try {
        const { sendShippingCreatedEmail } = await import("@/lib/email/orderEmails");
        const emailResult = await sendShippingCreatedEmail(orderId);
        if (!emailResult.ok) {
          console.warn("[create-label] Error al enviar email de envío generado:", emailResult.error);
        } else if (emailResult.sent) {
          console.log("[create-label] Email de envío generado enviado:", orderId);
        }
      } catch (emailError) {
        console.error("[create-label] Error inesperado al enviar email:", emailError);
        // No fallar si falla el email
      }
    }

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

    // Verificar si se actualizó correctamente
    if (!verifyOrder) {
      return NextResponse.json(
        {
          ok: false,
          code: "unknown_error",
          message: "No se pudo verificar la actualización de la orden.",
        } satisfies CreateLabelResponse,
        { status: 500 },
      );
    }

    const verifyMetadata = (verifyOrder.metadata as Record<string, unknown>) || {};
    const verifyShippingMeta = (verifyMetadata.shipping as Record<string, unknown>) || {};
    const finalShipmentId = (verifyShippingMeta.shipment_id as string) || shipmentResult.rawId || null;

    // Si no hay tracking después del polling, devolver tracking_pending
    if (!shipmentResult.trackingNumber && !shipmentResult.labelUrl) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[create-label] Envío creado pero tracking/label pendientes:", {
          orderId,
          shipmentId: finalShipmentId,
          pollingInfo: shipmentResult.pollingInfo,
        });
      }

      return NextResponse.json(
        {
          ok: false,
          code: "tracking_pending",
          message: "El envío fue creado en Skydropx pero el tracking/label aún no está disponible. Reintenta en unos momentos.",
          shipmentId: finalShipmentId,
          pollingInfo: shipmentResult.pollingInfo,
        } satisfies CreateLabelResponse,
        { status: 202 }, // Accepted (procesando)
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[create-label] Envío creado exitosamente:", {
        orderId,
        trackingNumber: shipmentResult.trackingNumber || "[pendiente]",
        hasLabel: !!shipmentResult.labelUrl,
        shipmentId: finalShipmentId,
        pollingInfo: shipmentResult.pollingInfo,
      });
    }

    return NextResponse.json({
      ok: true,
      trackingNumber: verifyOrder.shipping_tracking_number || shipmentResult.trackingNumber || null,
      labelUrl: verifyOrder.shipping_label_url || shipmentResult.labelUrl || null,
      shipmentId: finalShipmentId,
      trackingPending: !shipmentResult.trackingNumber || !shipmentResult.labelUrl,
      pollingInfo: shipmentResult.pollingInfo,
    } satisfies CreateLabelResponse);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[create-label] Error inesperado:", error);
    }

    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    const errorCode = (error as Error & { code?: string }).code;
    const statusCode = (error as Error & { statusCode?: number }).statusCode;
    const errorDetails = (error as Error & { details?: unknown }).details;

    // Detectar errores específicos de Skydropx
    // Respetar err.code si ya viene seteado, pero mapear explícitamente por statusCode
    const isSkydropxError =
      errorMessage.includes("Skydropx") ||
      errorMessage.includes("token") ||
      errorMessage.includes("Credenciales") ||
      errorCode === "skydropx_not_found" ||
      errorCode === "skydropx_oauth_failed" ||
      errorCode === "skydropx_unauthorized" ||
      errorCode === "skydropx_bad_request" ||
      errorCode === "skydropx_unprocessable_entity" ||
      statusCode === 422 ||
      statusCode === 400 ||
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 404;

    if (isSkydropxError) {
      // Mapear explícitamente por statusCode primero, luego por errorCode
      const skydropxCode: Extract<CreateLabelResponse, { ok: false }>["code"] =
        statusCode === 422
          ? "skydropx_unprocessable_entity"
          : statusCode === 400
            ? "skydropx_bad_request"
            : statusCode === 404
              ? "skydropx_not_found"
              : statusCode === 401 || statusCode === 403
                ? "skydropx_unauthorized"
                : errorCode === "skydropx_not_found"
                  ? "skydropx_not_found"
                  : errorCode === "skydropx_oauth_failed"
                    ? "skydropx_oauth_failed"
                    : errorCode === "skydropx_unauthorized"
                      ? "skydropx_unauthorized"
                      : errorCode === "skydropx_unprocessable_entity"
                        ? "skydropx_unprocessable_entity"
                        : errorCode === "skydropx_bad_request"
                          ? "skydropx_bad_request"
                          : "skydropx_error";

      // Si es 400, construir payloadHealth sin PII
      let enhancedDetails = errorDetails;
      if (statusCode === 400 || errorCode === "skydropx_bad_request") {
        // Re-leer order para payloadHealth (solo si orderId está disponible)
        try {
          const orderIdForPayloadHealth = (req as any)._orderId || null;
          if (orderIdForPayloadHealth) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (supabaseUrl && serviceRoleKey) {
              const tempSupabase = createClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false },
              });
              const { data: tempOrder } = await tempSupabase
                .from("orders")
                .select("metadata, shipping_rate_ext_id")
                .eq("id", orderIdForPayloadHealth)
                .single();
              
              if (tempOrder) {
                const config = getSkydropxConfig();
                const addressTo = extractAddressFromMetadata(tempOrder.metadata);
                const addressFrom = config
                  ? {
                      countryCode: config.origin.country,
                      postalCode: config.origin.postalCode,
                      state: config.origin.state,
                      city: config.origin.city,
                      address1: config.origin.addressLine1 || "",
                      name: config.origin.name,
                      phone: config.origin.phone || null,
                      email: config.origin.email || null,
                    }
                  : null;

                const payloadHealth = {
                  hasRateId: !!(tempOrder.shipping_rate_ext_id && typeof tempOrder.shipping_rate_ext_id === "string" && tempOrder.shipping_rate_ext_id.trim() !== ""),
                  hasFromStreet1: !!(addressFrom?.address1 && addressFrom.address1.trim() !== ""),
                  hasFromName: !!(addressFrom?.name && addressFrom.name.trim() !== ""),
                  hasFromCompany: true, // Siempre se asigna default "DDN"
                  hasFromReference: true, // Siempre se asigna default "Sin referencia"
                  hasFromZip: !!(addressFrom?.postalCode && addressFrom.postalCode.trim() !== ""),
                  hasFromCity: !!(addressFrom?.city && addressFrom.city.trim() !== ""),
                  hasFromState: !!(addressFrom?.state && addressFrom.state.trim() !== ""),
                  hasToStreet1: !!(addressTo?.address1 && addressTo.address1.trim() !== ""),
                  hasToName: !!(addressTo?.name && addressTo.name.trim() !== ""),
                  hasToCompany: true, // Siempre se asigna default "Particular"
                  hasToReference: true, // Siempre se asigna default "Sin referencia"
                  hasToZip: !!(addressTo?.postalCode && addressTo.postalCode.trim() !== ""),
                  hasToCity: !!(addressTo?.city && addressTo.city.trim() !== ""),
                  hasToState: !!(addressTo?.state && addressTo.state.trim() !== ""),
                  hasPackages: true, // Siempre se crea al menos 1 paquete
                  phoneDigitsLen: addressFrom?.phone ? addressFrom.phone.replace(/\D/g, "").length : 0,
                  toPhoneDigitsLen: addressTo?.phone ? addressTo.phone.replace(/\D/g, "").length : 0,
                  fromStreet1Len: addressFrom?.address1?.length || 0,
                  toStreet1Len: addressTo?.address1?.length || 0,
                };

                enhancedDetails = {
                  ...(typeof errorDetails === "object" && errorDetails !== null ? errorDetails : {}),
                  payloadHealth,
                };
              }
            }
          }
        } catch {
          // Si falla obtener order, usar errorDetails sin payloadHealth
        }
      }

      return NextResponse.json(
        {
          ok: false,
          code: skydropxCode,
          message: errorMessage,
          statusCode: statusCode || undefined,
          details: enhancedDetails || undefined,
        } satisfies CreateLabelResponse,
        {
          status:
            statusCode === 404
              ? 404
              : statusCode === 401 || statusCode === 403
                ? 401
                : statusCode === 422
                  ? 422
                  : statusCode === 400
                    ? 400
                    : statusCode || 500,
        },
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

