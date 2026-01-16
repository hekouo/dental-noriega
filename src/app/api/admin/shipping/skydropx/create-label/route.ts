import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import {
  createQuotation,
  getShipment,
  skydropxFetch,
  type SkydropxQuotationRate,
  type SkydropxQuotationPayload,
} from "@/lib/skydropx/client";
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
        | "skydropx_no_rates"
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
    const extractTrackingAndLabel = (shipmentResponse: unknown) => {
      const anyResponse = shipmentResponse as any;
      const trackingNumber =
        anyResponse?.master_tracking_number ||
        anyResponse?.data?.master_tracking_number ||
        anyResponse?.tracking_number ||
        anyResponse?.data?.tracking_number ||
        anyResponse?.tracking ||
        (anyResponse?.included && Array.isArray(anyResponse.included)
          ? anyResponse.included.find((pkg: any) => pkg?.tracking_number)?.tracking_number
          : null) ||
        anyResponse?.shipment?.tracking_number ||
        anyResponse?.shipment?.master_tracking_number ||
        null;

      let labelUrl: string | null = null;
      if (anyResponse?.included && Array.isArray(anyResponse.included)) {
        const firstPackage = anyResponse.included.find((pkg: any) => pkg?.label_url);
        if (firstPackage?.label_url) {
          labelUrl = firstPackage.label_url;
        }
      }
      if (!labelUrl) {
        labelUrl =
          anyResponse?.label_url ||
          anyResponse?.data?.label_url ||
          anyResponse?.label_url_pdf ||
          anyResponse?.files?.label ||
          anyResponse?.shipment?.label_url ||
          null;
      }

      return { trackingNumber, labelUrl };
    };

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

    const isValidPositiveNumber = (value: unknown): value is number =>
      typeof value === "number" && value > 0;

    const normalizePackageCandidate = (candidate: unknown) => {
      if (!candidate || typeof candidate !== "object") return null;
      const data = candidate as Record<string, unknown>;
      const weight = data.weight_g;
      const length = data.length_cm;
      const width = data.width_cm;
      const height = data.height_cm;
      if (
        isValidPositiveNumber(weight) &&
        isValidPositiveNumber(length) &&
        isValidPositiveNumber(width) &&
        isValidPositiveNumber(height)
      ) {
        return {
          weight_g: weight,
          length_cm: length,
          width_cm: width,
          height_cm: height,
        };
      }
      return null;
    };

    const normalizePackageForSkydropx = (metadata: Record<string, unknown>) => {
      const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
      const finalPackage =
        normalizePackageCandidate(metadata.shipping_package_final) ||
        normalizePackageCandidate(shippingMeta.package_final) ||
        normalizePackageCandidate(shippingMeta.shipping_package_final);

      const estimatedPackage =
        normalizePackageCandidate(metadata.shipping_package_estimated) ||
        normalizePackageCandidate(shippingMeta.estimated_package) ||
        normalizePackageCandidate(shippingMeta.shipping_package_estimated);

      const fallback = {
        weight_g: 1200,
        length_cm: 25,
        width_cm: 20,
        height_cm: 15,
      };

      if (finalPackage) {
        return { source: "final" as const, ...finalPackage };
      }
      if (estimatedPackage) {
        return { source: "estimated" as const, ...estimatedPackage };
      }
      return { source: "default" as const, ...fallback };
    };

    const finalPackageCandidate =
      normalizePackageCandidate(orderMetadata.shipping_package_final) ||
      normalizePackageCandidate(orderShippingMeta.package_final) ||
      normalizePackageCandidate(orderShippingMeta.shipping_package_final);

    const packageUsed = normalizePackageCandidate(orderShippingMeta.package_used);
    const shouldForceRecreate =
      !!finalPackageCandidate &&
      (!packageUsed ||
        packageUsed.weight_g !== finalPackageCandidate.weight_g ||
        packageUsed.length_cm !== finalPackageCandidate.length_cm ||
        packageUsed.width_cm !== finalPackageCandidate.width_cm ||
        packageUsed.height_cm !== finalPackageCandidate.height_cm);

    // Si ya tiene tracking y label completos, retornar datos existentes
    if (order.shipping_tracking_number && order.shipping_label_url && !shouldForceRecreate) {
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
    if (existingShipmentId && !shouldForceRecreate) {
      try {
        const shipmentResponse = await getShipment(existingShipmentId);
        
        // Extraer tracking y label usando helper tolerante
        const { trackingNumber, labelUrl } = extractTrackingAndLabel(shipmentResponse);

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
    if (!shouldForceRecreate) {
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

    // Obtener datos de dirección del destino
    const addressTo = extractAddressFromMetadata(order.metadata);
    const destinationAddress2 =
      (addressTo as { address2?: string | null } | null)?.address2 || null;

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

    const normalizedPackage = normalizePackageForSkydropx(packageMetadata);
    const packageSource = normalizedPackage.source;
    const weightG = normalizedPackage.weight_g;
    const lengthCm = normalizedPackage.length_cm;
    const widthCm = normalizedPackage.width_cm;
    const heightCm = normalizedPackage.height_cm;
    const weightKg = weightG / 1000;

    if (process.env.NODE_ENV !== "production") {
      console.log("[create-label] Creando envío:", {
        orderId,
        forceRecreate: shouldForceRecreate,
        previousShipmentId: existingShipmentId,
        rateId: order.shipping_rate_ext_id,
        from: `${addressFrom.city}, ${addressFrom.postalCode}`,
        to: `${addressTo.city}, ${addressTo.postalCode}`,
        hasConsignmentNote: !!consignmentNote,
        hasPackageType: !!packageType,
        package: {
          source: packageSource,
          weightG,
          weightKg,
          lengthCm,
          widthCm,
          heightCm,
        },
        payloadUnit: "kg",
      });
    }

    // Si hay shipment previo y cambió el paquete final, cancelar antes de recrear
    if (shouldForceRecreate && existingShipmentId) {
      try {
        const cancelPath = `/api/v1/shipments/${existingShipmentId}/cancellations`;
        const cancelPayload = {
          reason: "Paquete real actualizado en admin DDN",
          shipment_id: existingShipmentId,
        };
        if (process.env.NODE_ENV !== "production") {
          console.log("[create-label] Cancelando shipment previo:", {
            shipmentId: existingShipmentId,
            path: cancelPath,
          });
        }
        await skydropxFetch(cancelPath, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cancelPayload),
        });
      } catch (cancelError) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[create-label] No se pudo cancelar shipment previo:", cancelError);
        }
      }
    }

    type RateSelection = {
      rate: SkydropxQuotationRate;
      rateId: string;
      provider: string | null;
      service: string | null;
      priceCents: number | null;
      source: "exact" | "provider_service" | "fallback";
      matchedBy: "id" | "provider_service" | "fallback";
    };

    const normalizeText = (value?: string | null) =>
      value?.toLowerCase().replace(/\s+/g, " ").trim() || "";

    const getRateId = (rate: SkydropxQuotationRate): string | null => {
      const candidate =
        rate.id ||
        (rate as { external_id?: string }).external_id ||
        (rate as { rate_id?: string }).rate_id ||
        null;
      return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
    };

    const getRateProvider = (rate: SkydropxQuotationRate): string | null => {
      const candidate =
        rate.provider_name ||
        rate.provider_display_name ||
        (rate as { carrier?: string }).carrier ||
        (rate as { carrier_name?: string }).carrier_name ||
        null;
      return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
    };

    const getRateService = (rate: SkydropxQuotationRate): string | null => {
      const candidate =
        rate.provider_service_name ||
        (rate as { service?: string }).service ||
        (rate as { service_name?: string }).service_name ||
        null;
      return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
    };

    const getRatePriceValue = (rate: SkydropxQuotationRate): number | null => {
      const candidate =
        rate.total ??
        (rate as { amount?: number }).amount ??
        (rate as { price?: number }).price ??
        (rate as { price_total?: number }).price_total ??
        null;
      return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
    };

    let selectedRateForShipment: RateSelection | null = null;

    const createShipmentWithFinalPackage = async () => {
      const weightKgPrecise = Math.max(1, Number((weightG / 1000).toFixed(2)));
      const parcel = {
        weight: weightKgPrecise,
        height: Math.max(1, Math.round(heightCm)),
        width: Math.max(1, Math.round(widthCm)),
        length: Math.max(1, Math.round(lengthCm)),
        distance_unit: "CM" as const,
        mass_unit: "KG" as const,
      };
      const quotationReference = orderId ? `DDN-${orderId.slice(0, 8)}` : "DDN-unknown";

      const quotationPayload: SkydropxQuotationPayload = {
        address_from: {
          country: addressFrom.countryCode || "MX",
          zip: addressFrom.postalCode,
          state: addressFrom.state,
          city: addressFrom.city,
          address1: addressFrom.address1 || null,
          address2: config.origin.areaLevel3 || undefined,
        },
        address_to: {
          country: addressTo.countryCode || "MX",
          zip: addressTo.postalCode,
          state: addressTo.state,
          city: addressTo.city,
          address1: addressTo.address1 || null,
          address2: destinationAddress2 || undefined,
        },
        parcels: [parcel],
        reference: quotationReference,
      };

      if (process.env.NODE_ENV !== "production") {
        console.log("[create-label] Payload quotation (sin PII):", {
          reference: quotationReference,
          quotationKeys: Object.keys(quotationPayload),
          hasOrderId: Boolean(quotationPayload.order_id),
          packageSource,
          weightG,
          weightKgPrecise,
          lengthCm: parcel.length,
          widthCm: parcel.width,
          heightCm: parcel.height,
        });
      }

      const quotationResult = await createQuotation(quotationPayload);
      if (!quotationResult.ok) {
        const error = new Error("Skydropx rechazó la cotización con paquete final");
        const isBadRequest = quotationResult.code === "invalid_params";
        (error as Error & { code?: string; details?: unknown; statusCode?: number }).code = isBadRequest
          ? "skydropx_bad_request"
          : "skydropx_error";
        (error as Error & { statusCode?: number }).statusCode = isBadRequest ? 400 : undefined;
        (error as Error & { details?: unknown }).details = quotationResult.errors;
        throw error;
      }

      const quotationId =
        quotationResult.quotationId ||
        quotationResult.data?.id ||
        quotationResult.data?.quotation?.id ||
        null;

      const rates =
        quotationResult.data?.data ||
        quotationResult.data?.included ||
        quotationResult.data?.quotation?.rates ||
        [];

      const shippingMeta = (packageMetadata.shipping as Record<string, unknown>) || {};
      if (!quotationId || rates.length === 0) {
        const error = new Error("Skydropx no devolvió tarifas para la cotización.");
        (error as Error & { code?: string; statusCode?: number; details?: unknown }).code =
          "skydropx_no_rates";
        (error as Error & { statusCode?: number }).statusCode = 502;
        (error as Error & { details?: unknown }).details = {
          quotation_id: quotationId,
          rates_count: rates.length,
        };
        throw error;
      }

      const selectRateFromQuotation = ({
        quotationRates,
        orderRateId,
        orderRateMeta,
      }: {
        quotationRates: SkydropxQuotationRate[];
        orderRateId?: string | null;
        orderRateMeta?: { provider?: string; service?: string; external_id?: string };
      }): RateSelection => {
        const rateCandidates = [
          orderRateId?.trim() || null,
          orderRateMeta?.external_id?.trim() || null,
        ].filter(Boolean) as string[];

        const exactMatch = rateCandidates.length
          ? quotationRates.find((rate) => {
              const rateId = getRateId(rate);
              return rateId ? rateCandidates.includes(rateId) : false;
            })
          : undefined;

        if (exactMatch) {
          const rateId = getRateId(exactMatch) || exactMatch.id;
          const provider = getRateProvider(exactMatch);
          const service = getRateService(exactMatch);
          const priceValue = getRatePriceValue(exactMatch);
          return {
            rate: exactMatch,
            rateId,
            provider,
            service,
            priceCents: priceValue ? Math.round(priceValue * 100) : null,
            source: "exact",
            matchedBy: "id",
          };
        }

        const normalizedProvider = normalizeText(orderRateMeta?.provider);
        const normalizedService = normalizeText(orderRateMeta?.service);
        const providerServiceMatch =
          normalizedProvider && normalizedService
            ? quotationRates.find((rate) => {
                const provider = normalizeText(getRateProvider(rate));
                const service = normalizeText(getRateService(rate));
                return provider === normalizedProvider && service === normalizedService;
              })
            : undefined;

        if (providerServiceMatch) {
          const rateId = getRateId(providerServiceMatch) || providerServiceMatch.id;
          const provider = getRateProvider(providerServiceMatch);
          const service = getRateService(providerServiceMatch);
          const priceValue = getRatePriceValue(providerServiceMatch);
          return {
            rate: providerServiceMatch,
            rateId,
            provider,
            service,
            priceCents: priceValue ? Math.round(priceValue * 100) : null,
            source: "provider_service",
            matchedBy: "provider_service",
          };
        }

        const ratesWithPrice = quotationRates
          .map((rate) => ({ rate, price: getRatePriceValue(rate) }))
          .filter((item) => typeof item.price === "number");
        const fallbackRate =
          ratesWithPrice.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0]?.rate ||
          quotationRates[0];
        const fallbackRateId = getRateId(fallbackRate) || fallbackRate.id;
        const fallbackProvider = getRateProvider(fallbackRate);
        const fallbackService = getRateService(fallbackRate);
        const fallbackPriceValue = getRatePriceValue(fallbackRate);
        return {
          rate: fallbackRate,
          rateId: fallbackRateId,
          provider: fallbackProvider,
          service: fallbackService,
          priceCents: fallbackPriceValue ? Math.round(fallbackPriceValue * 100) : null,
          source: "fallback",
          matchedBy: "fallback",
        };
      };

      const rateMeta =
        shippingMeta.rate && typeof shippingMeta.rate === "object"
          ? (shippingMeta.rate as { provider?: string; service?: string; external_id?: string })
          : undefined;

      const rateSelection = selectRateFromQuotation({
        quotationRates: rates,
        orderRateId: order.shipping_rate_ext_id,
        orderRateMeta: rateMeta,
      });
      selectedRateForShipment = rateSelection;

      if (process.env.NODE_ENV !== "production") {
        console.log("[create-label] Rate selection:", {
          quotation_id: quotationId,
          rates_count: rates.length,
          selected_rate_id: rateSelection.rateId,
          select_source: rateSelection.source,
          matched_by: rateSelection.matchedBy,
          price_cents: rateSelection.priceCents,
        });
      }

      const shipmentPayload = {
        shipment: {
          quotation: { id: quotationId },
          rate_id: rateSelection.rateId,
          address_from: {
            country: addressFrom.countryCode || "MX",
            country_code: addressFrom.countryCode || "MX",
            zip: addressFrom.postalCode,
            postal_code: addressFrom.postalCode,
            city: addressFrom.city,
            state: addressFrom.state,
            province: addressFrom.state,
            street1: addressFrom.address1,
            address1: addressFrom.address1,
            name: addressFrom.name,
            company: "DDN",
            reference: config.origin.reference || "Sin referencia",
            phone: addressFrom.phone || null,
            email: addressFrom.email || null,
          },
          address_to: {
            country: addressTo.countryCode || "MX",
            country_code: addressTo.countryCode || "MX",
            zip: addressTo.postalCode,
            postal_code: addressTo.postalCode,
            city: addressTo.city,
            state: addressTo.state,
            province: addressTo.state,
            street1: addressTo.address1,
            address1: addressTo.address1,
            name: addressTo.name,
            company: "Particular",
            reference: "Sin referencia",
            phone: addressTo.phone || null,
            email: addressTo.email || null,
          },
          packages: [
            {
              package_number: "1",
              package_protected: false,
              weight: weightKgPrecise,
              height: parcel.height,
              width: parcel.width,
              length: parcel.length,
              consignment_note: consignmentNote,
              package_type: packageType,
            },
          ],
          printing_format: "standard",
        },
      };

      if (process.env.NODE_ENV !== "production") {
        console.log("[create-label] Payload shipments (sin PII):", {
          quotationId,
          rateId: rateSelection.rateId,
          packageSource,
          weightG,
          weightKgPrecise,
          lengthCm: parcel.length,
          widthCm: parcel.width,
          heightCm: parcel.height,
        });
      }

      const response = await skydropxFetch("/api/v1/shipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shipmentPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedBody: unknown = null;
        try {
          parsedBody = JSON.parse(errorText);
        } catch {
          parsedBody = null;
        }
        const error = new Error("Skydropx rechazó el envío con paquete final");
        (error as Error & { statusCode?: number; details?: unknown }).statusCode =
          response.status;
        (error as Error & { details?: unknown }).details = parsedBody;
        throw error;
      }

      const created = (await response.json().catch(() => null)) as any;
      const rawId = created?.id || created?.data?.id || created?.shipment?.id || null;
      if (!rawId) {
        throw new Error("No se recibió shipment_id de Skydropx.");
      }

      const parsedCreated = extractTrackingAndLabel(created);
      let trackingNumber = parsedCreated.trackingNumber;
      let labelUrl = parsedCreated.labelUrl;
      if (!trackingNumber || !labelUrl) {
        const shipmentDetails = await getShipment(rawId);
        const parsed = extractTrackingAndLabel(shipmentDetails);
        trackingNumber = parsed.trackingNumber;
        labelUrl = parsed.labelUrl;
      }

      return {
        rawId,
        trackingNumber,
        labelUrl,
        pollingInfo: undefined,
        quotationId,
        rateId: rateSelection.rateId,
      };
    };

    // Crear el shipment en Skydropx
    const shipmentResult = await createShipmentWithFinalPackage();

    if (process.env.NODE_ENV !== "production") {
      console.log("[create-label] Shipment creado:", {
        orderId,
        previousShipmentId: existingShipmentId,
        newShipmentId: shipmentResult.rawId || null,
        packageSource: packageSource,
        weightG,
        weightKg,
      });
    }

    // Persistir shipment_id y rate usados ANTES de cualquier paso adicional
    try {
      if (!selectedRateForShipment) {
        throw new Error("Rate seleccionado no disponible para persistencia temprana.");
      }
      const selectedRate = selectedRateForShipment as RateSelection;
      const earlyMetadata = (order.metadata as Record<string, unknown>) || {};
      const earlyShippingMeta = (earlyMetadata.shipping as Record<string, unknown>) || {};
      const earlyRateMeta =
        earlyShippingMeta.rate && typeof earlyShippingMeta.rate === "object"
          ? (earlyShippingMeta.rate as Record<string, unknown>)
          : {};

      const earlyUpdatedShippingMeta = {
        ...earlyShippingMeta,
        shipment_id: shipmentResult.rawId || earlyShippingMeta.shipment_id || null,
        quotation_id: shipmentResult.quotationId || earlyShippingMeta.quotation_id || null,
        rate_id: selectedRate.rateId,
        rate: {
          ...earlyRateMeta,
          external_id: selectedRate.rateId,
          provider: selectedRate.provider || earlyRateMeta.provider || null,
          service: selectedRate.service || earlyRateMeta.service || null,
        },
        rate_used: {
          rate_id: selectedRate.rateId,
          provider: selectedRate.provider,
          service: selectedRate.service,
          price_cents: selectedRate.priceCents,
          source: selectedRate.source,
        },
        package_used: {
          weight_g: weightG,
          length_cm: lengthCm,
          width_cm: widthCm,
          height_cm: heightCm,
          source: packageSource,
        },
      };

      const earlyUpdateData: Record<string, unknown> = {
        metadata: {
          ...earlyMetadata,
          shipping: earlyUpdatedShippingMeta,
        },
        updated_at: new Date().toISOString(),
      };

      if (shipmentResult.rawId) {
        earlyUpdateData.shipping_shipment_id = shipmentResult.rawId;
      }
      if (order.shipping_rate_ext_id !== selectedRate.rateId) {
        earlyUpdateData.shipping_rate_ext_id = selectedRate.rateId;
      }

      await supabase.from("orders").update(earlyUpdateData).eq("id", orderId);

      if (process.env.NODE_ENV !== "production") {
        console.log("[create-label] Persistencia temprana:", {
          shipment_id: shipmentResult.rawId || null,
          quotation_id: shipmentResult.quotationId || null,
          rate_id: selectedRate.rateId,
        });
      }
    } catch (earlyPersistError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[create-label] No se pudo persistir shipment temprano:", earlyPersistError);
      }
    }

    // Obtener detalles del shipment recién creado para debug (peso real en Skydropx)
    let shipmentDebug: Record<string, unknown> | null = null;
    if (shipmentResult.rawId) {
      try {
        const shipmentDetails = await getShipment(shipmentResult.rawId);
        const detailsAny = shipmentDetails as Record<string, any>;
        const included = Array.isArray(detailsAny?.included) ? detailsAny.included : [];
        const dataAttributes = detailsAny?.data?.attributes || {};
        const firstIncludedAttrs = included.find((pkg: any) => pkg?.attributes)?.attributes || {};
        const parcels = Array.isArray(detailsAny?.data?.parcels) ? detailsAny.data.parcels : [];
        const firstParcel = parcels[0] || {};

        const weight =
          dataAttributes.weight ||
          dataAttributes.declared_weight ||
          firstIncludedAttrs.weight ||
          firstIncludedAttrs.declared_weight ||
          firstParcel.weight ||
          null;
        const weightUnit =
          dataAttributes.mass_unit ||
          dataAttributes.weight_unit ||
          firstIncludedAttrs.mass_unit ||
          firstIncludedAttrs.weight_unit ||
          null;
        const dimensions = {
          length:
            dataAttributes.length ||
            firstIncludedAttrs.length ||
            firstParcel.length ||
            null,
          width:
            dataAttributes.width ||
            firstIncludedAttrs.width ||
            firstParcel.width ||
            null,
          height:
            dataAttributes.height ||
            firstIncludedAttrs.height ||
            firstParcel.height ||
            null,
        };

        const rawSample = {
          data_keys: detailsAny?.data ? Object.keys(detailsAny.data).slice(0, 20) : [],
          data_attributes_keys: dataAttributes ? Object.keys(dataAttributes).slice(0, 20) : [],
          included_count: included.length,
          included_keys_sample: included[0] ? Object.keys(included[0]).slice(0, 20) : [],
          included_attributes_keys_sample: firstIncludedAttrs ? Object.keys(firstIncludedAttrs).slice(0, 20) : [],
        };

        shipmentDebug = {
          shipment_id: shipmentResult.rawId,
          carrier: dataAttributes.carrier || detailsAny?.data?.carrier || detailsAny?.carrier || null,
          service: dataAttributes.service || detailsAny?.data?.service || detailsAny?.service || null,
          weight,
          weight_unit: weightUnit,
          dimensions,
          raw_sample: rawSample,
        };

        if (process.env.NODE_ENV !== "production") {
          console.log("[create-label] Shipment debug:", shipmentDebug);
        }
      } catch (debugError) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[create-label] No se pudo obtener detalles del shipment:", debugError);
        }
      }
    }

    // Merge seguro de metadata (NO sobreescribir completo)
    const finalMetadata = (order.metadata as Record<string, unknown>) || {};
    const finalShippingMeta = (finalMetadata.shipping as Record<string, unknown>) || {};

    if (!selectedRateForShipment) {
      const error = new Error("No se encontró rate seleccionado para el envío.");
      (error as Error & { code?: string; statusCode?: number }).code = "rate_id_no_encontrado";
      (error as Error & { statusCode?: number }).statusCode = 500;
      throw error;
    }

    const selectedRate = selectedRateForShipment as RateSelection;
    
    // IMPORTANTE: SIEMPRE guardar shipment_id en metadata, incluso si tracking está pendiente
    // Esto permite cancelar el envío después aunque tracking no esté disponible inmediatamente
    const existingRateMeta =
      finalShippingMeta.rate && typeof finalShippingMeta.rate === "object"
        ? (finalShippingMeta.rate as Record<string, unknown>)
        : {};
    const updatedRateMeta = {
      ...existingRateMeta,
      external_id: selectedRate.rateId,
      provider: selectedRate.provider || existingRateMeta.provider || null,
      service: selectedRate.service || existingRateMeta.service || null,
    };
    const updatedShippingMeta = {
      ...finalShippingMeta, // Preservar datos existentes (cancel_request_id, cancel_status, etc.)
      shipment_id: shipmentResult.rawId || finalShippingMeta.shipment_id || null, // SIEMPRE guardar/actualizar shipment_id
      quotation_id: shipmentResult.quotationId || finalShippingMeta.quotation_id || null,
      rate_id: selectedRate.rateId,
      rate: updatedRateMeta,
      rate_used: {
        rate_id: selectedRate.rateId,
        provider: selectedRate.provider,
        service: selectedRate.service,
        price_cents: selectedRate.priceCents,
        source: selectedRate.source,
      },
      package_used: {
        weight_g: weightG,
        length_cm: lengthCm,
        width_cm: widthCm,
        height_cm: heightCm,
        source: packageSource,
      },
        shipment_payload_debug: {
          quotation_id: (shipmentResult as { quotationId?: string }).quotationId || null,
        rate_id: (shipmentResult as { rateId?: string }).rateId || selectedRate.rateId,
          package_source: packageSource,
          parcels: [
            {
              weight_kg: Math.max(1, Number((weightG / 1000).toFixed(2))),
              length_cm: lengthCm,
              width_cm: widthCm,
              height_cm: heightCm,
            },
          ],
        },
      ...(shipmentDebug ? { shipment_debug: shipmentDebug } : {}),
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
    if (order.shipping_rate_ext_id !== selectedRate.rateId) {
      updateData.shipping_rate_ext_id = selectedRate.rateId;
    }

    // Solo actualizar tracking/label si están disponibles (no null)
    if (shipmentResult.trackingNumber) {
      updateData.shipping_tracking_number = shipmentResult.trackingNumber;
    }
    if (shipmentResult.labelUrl) {
      updateData.shipping_label_url = shipmentResult.labelUrl;
    }

    const updateQuery = supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (!shouldForceRecreate) {
      updateQuery.is("shipping_tracking_number", null); // Solo actualizar si aún no tiene tracking (doble verificación)
    }

    const { error: updateError } = await updateQuery;

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
      errorCode === "skydropx_no_rates" ||
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
            : statusCode === 502
              ? "skydropx_no_rates"
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
                          : errorCode === "skydropx_no_rates"
                            ? "skydropx_no_rates"
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

