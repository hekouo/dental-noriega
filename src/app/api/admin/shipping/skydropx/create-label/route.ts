import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import {
  createQuotation,
  getShipment,
  skydropxFetch,
  extractQuotationRates,
  waitForQuotationRates,
  getSkydropxApiHosts,
  type SkydropxQuotationRate,
  type SkydropxQuotationPayload,
} from "@/lib/skydropx/client";
import { getSkydropxConfig } from "@/lib/shipping/skydropx.server";
import { getOrderShippingAddress } from "@/lib/shipping/getOrderShippingAddress";
import { normalizeShippingPricing } from "@/lib/shipping/normalizeShippingPricing";
import { normalizeShippingMetadata } from "@/lib/shipping/normalizeShippingMetadata";

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
      already_created?: boolean;
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
        | "missing_shipping_address"
        | "missing_selected_rate"
        | "missing_final_package"
        | "skydropx_error"
        | "skydropx_not_found"
        | "skydropx_oauth_failed"
        | "skydropx_unauthorized"
        | "skydropx_bad_request"
        | "skydropx_unprocessable_entity"
        | "skydropx_no_rates"
        | "invalid_shipping_payload"
        | "label_creation_in_progress"
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


export async function POST(req: NextRequest) {
  let labelCreationRequestId: string | null = null;
  let labelCreationPayload: {
    status: string;
    started_at: string;
    finished_at: string | null;
    request_id: string;
  } | null = null;
  let supabaseClient: any = null;
  let orderIdForError: string | null = null;
  let orderForError: any = null;
  try {
    const resolveShippingPricing = (
      existingPricing: Record<string, unknown> | null,
      carrierCents: number | null,
      etaMin: number | null,
      etaMax: number | null,
    ) => {
      if (!existingPricing && typeof carrierCents !== "number") return null;
      const baseCarrier =
        typeof carrierCents === "number"
          ? carrierCents
          : typeof existingPricing?.carrier_cents === "number"
            ? existingPricing.carrier_cents
            : null;
      const packagingCents =
        typeof existingPricing?.packaging_cents === "number" ? existingPricing.packaging_cents : 2000;
      const totalFromExisting =
        typeof existingPricing?.total_cents === "number"
          ? existingPricing.total_cents
          : typeof existingPricing?.customer_total_cents === "number"
            ? existingPricing.customer_total_cents
            : null;
      const marginCents =
        typeof totalFromExisting === "number" && typeof baseCarrier === "number"
          ? Math.max(0, totalFromExisting - baseCarrier - packagingCents)
          : typeof existingPricing?.margin_cents === "number"
            ? existingPricing.margin_cents
            : typeof baseCarrier === "number"
              ? Math.min(Math.round(baseCarrier * 0.05), 3000)
              : 0;
      const totalCents =
        typeof totalFromExisting === "number" && totalFromExisting >= 0 && typeof baseCarrier === "number"
          ? totalFromExisting
          : typeof baseCarrier === "number"
            ? baseCarrier + packagingCents + marginCents
            : null;
      const pricingInput = {
        carrier_cents: baseCarrier ?? undefined,
        packaging_cents: packagingCents,
        margin_cents: marginCents,
        total_cents: totalCents ?? undefined,
        customer_eta_min_days:
          typeof existingPricing?.customer_eta_min_days === "number"
            ? existingPricing.customer_eta_min_days
            : etaMin,
        customer_eta_max_days:
          typeof existingPricing?.customer_eta_max_days === "number"
            ? existingPricing.customer_eta_max_days
            : etaMax,
      };
      return normalizeShippingPricing(pricingInput);
    };
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
    supabaseClient = supabase;
    orderIdForError = orderId;
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
    orderForError = order as Record<string, unknown>;

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
      const packageUsed =
        normalizePackageCandidate(shippingMeta.package_used) ||
        normalizePackageCandidate((shippingMeta as { package_used?: unknown }).package_used);

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
      if (packageUsed) {
        return { source: "package_used" as const, ...packageUsed };
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

    const hasLabel = Boolean(order.shipping_label_url || order.shipping_tracking_number);
    const hasShipmentAndRate =
      Boolean(existingShipmentId) && Boolean(order.shipping_rate_ext_id);
    const labelCreation =
      (orderShippingMeta.label_creation as { status?: string; started_at?: string | null }) || null;
    const rateUsed = (orderShippingMeta.rate_used as Record<string, unknown>) || null;
    const rateUsedExternalId =
      (typeof rateUsed?.external_rate_id === "string" && rateUsed.external_rate_id.trim()) ||
      (typeof rateUsed?.rate_id === "string" && rateUsed.rate_id.trim()) ||
      null;
    const nowTs = Date.now();
    const startedAtTs =
      typeof labelCreation?.started_at === "string"
        ? Date.parse(labelCreation.started_at)
        : NaN;
    const LABEL_CREATION_TTL_MS = 5 * 60 * 1000;
    const isLockActive =
      labelCreation?.status === "in_progress" &&
      Number.isFinite(startedAtTs) &&
      nowTs - startedAtTs < LABEL_CREATION_TTL_MS;

    if (process.env.NODE_ENV !== "production") {
      console.log("[create-label] Idempotency check:", {
        orderId,
        has_label: hasLabel,
        has_tracking: Boolean(order.shipping_tracking_number),
        has_pricing: Boolean(orderMetadata.shipping_pricing),
        has_shipment: Boolean(existingShipmentId),
        has_rate: Boolean(order.shipping_rate_ext_id),
        has_selected_rate: Boolean(rateUsedExternalId),
        label_creation_status: labelCreation?.status || null,
      });
    }

    if (isLockActive) {
      return NextResponse.json(
        {
          ok: false,
          code: "label_creation_in_progress",
          message: "La creación de la guía está en progreso. Intenta de nuevo en unos momentos.",
        } satisfies CreateLabelResponse,
        { status: 409 },
      );
    }

    if (hasLabel || hasShipmentAndRate) {
      return NextResponse.json(
        {
          ok: true,
          already_created: true,
          trackingNumber: order.shipping_tracking_number || null,
          labelUrl: order.shipping_label_url || null,
          shipmentId: existingShipmentId,
          trackingPending: !order.shipping_tracking_number || !order.shipping_label_url,
        } satisfies CreateLabelResponse,
        { status: 200 },
      );
    }

    if (!rateUsedExternalId) {
      return NextResponse.json(
        {
          ok: false,
          code: "missing_selected_rate",
          message: "Primero recotiza y aplica una tarifa.",
        } satisfies CreateLabelResponse,
        { status: 400 },
      );
    }

    labelCreationRequestId =
      typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `req_${Date.now()}`;
    labelCreationPayload = {
      status: "in_progress",
      started_at: new Date().toISOString(),
      finished_at: null,
      request_id: labelCreationRequestId,
    };
    await supabase
      .from("orders")
      .update({
        metadata: {
          ...orderMetadata,
          shipping: {
            ...orderShippingMeta,
            label_creation: labelCreationPayload,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // Obtener datos de dirección del destino desde metadata canónica
    const shippingAddressResult = getOrderShippingAddress(order, { requireName: true });
    if (process.env.NODE_ENV !== "production") {
      console.log("[create-label] Shipping address source:", {
        has_shipping_address: Boolean(shippingAddressResult),
        source_key_used: shippingAddressResult?.sourceKey || null,
      });
    }
    if (!shippingAddressResult) {
      return NextResponse.json(
        {
          ok: false,
          code: "missing_shipping_address",
          message: "Falta dirección en la orden.",
        } satisfies CreateLabelResponse,
        { status: 400 },
      );
    }

    const addressTo = {
      countryCode: shippingAddressResult.address.country,
      postalCode: shippingAddressResult.address.postalCode,
      state: shippingAddressResult.address.state,
      city: shippingAddressResult.address.city,
      address1: shippingAddressResult.address.address1,
      name: shippingAddressResult.address.name ?? "Cliente",
      phone: shippingAddressResult.address.phone ?? null,
      email: shippingAddressResult.address.email ?? null,
      address2: shippingAddressResult.address.address2 ?? null,
    };
    const destinationAddress2 = addressTo.address2 || null;

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
      etaMinDays: number | null;
      etaMaxDays: number | null;
      etaPolicy: "same_or_better" | "fallback_provider_service" | "fallback_cheapest" | "unknown";
      source: "exact" | "provider_service" | "fallback" | "eta";
      matchedBy: "id" | "provider_service" | "fallback" | "eta";
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

    const getRateEta = (
      rate: SkydropxQuotationRate,
    ): { etaMin: number | null; etaMax: number | null } => {
      const etaMinCandidate =
        (rate as { eta_min_days?: number }).eta_min_days ??
        (rate as { min_days?: number }).min_days ??
        (rate as { eta_min?: number }).eta_min ??
        null;
      const etaMaxCandidate =
        (rate as { eta_max_days?: number }).eta_max_days ??
        (rate as { max_days?: number }).max_days ??
        (rate as { eta_max?: number }).eta_max ??
        null;
      const daysCandidate =
        (rate as { days?: number }).days ??
        (rate as { delivery_days?: number }).delivery_days ??
        null;

      if (typeof daysCandidate === "number" && Number.isFinite(daysCandidate)) {
        return { etaMin: daysCandidate, etaMax: daysCandidate };
      }

      const etaMin =
        typeof etaMinCandidate === "number" && Number.isFinite(etaMinCandidate)
          ? etaMinCandidate
          : null;
      const etaMax =
        typeof etaMaxCandidate === "number" && Number.isFinite(etaMaxCandidate)
          ? etaMaxCandidate
          : null;

      return { etaMin, etaMax };
    };

    const clampSkydropxReference = (input: string) => {
      const normalized = input.replace(/\s+/g, " ").trim();
      return normalized.slice(0, 30);
    };

    let selectedRateForShipment: RateSelection | null = null;
    const shippingMeta = (packageMetadata.shipping as Record<string, unknown>) || {};
    const rateMeta =
      shippingMeta.rate && typeof shippingMeta.rate === "object"
        ? (shippingMeta.rate as {
            provider?: string;
            service?: string;
            external_id?: string;
            eta_min_days?: number | null;
            eta_max_days?: number | null;
          })
        : undefined;
    const savedQuotationId =
      typeof shippingMeta.quotation_id === "string" && shippingMeta.quotation_id.trim()
        ? shippingMeta.quotation_id.trim()
        : null;
    const savedQuotationHost =
      typeof shippingMeta.quotation_host_used === "string" && shippingMeta.quotation_host_used.trim()
        ? shippingMeta.quotation_host_used.trim()
        : null;
    const savedRateId =
      rateUsedExternalId ||
      (typeof order.shipping_rate_ext_id === "string" && order.shipping_rate_ext_id.trim()
        ? order.shipping_rate_ext_id.trim()
        : null) ||
      (typeof rateMeta?.external_id === "string" && rateMeta.external_id.trim()
        ? rateMeta.external_id.trim()
        : null);
    const quotedPackage =
      shippingMeta.quoted_package && typeof shippingMeta.quoted_package === "object"
        ? (shippingMeta.quoted_package as Record<string, unknown>)
        : null;

    const isInvalidQuotationError = (status: number, parsedBody: unknown) => {
      if (status !== 400 && status !== 422) return false;
      const raw = typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody || {});
      const text = raw.toLowerCase();
      return (
        text.includes("quotation") &&
        (text.includes("invalid") || text.includes("expired") || text.includes("expir"))
      );
    };

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
      const originReference = clampSkydropxReference(config.origin.reference || "Sin referencia");
      const destinationReference = clampSkydropxReference("Sin referencia");

      if (process.env.NODE_ENV !== "production") {
        console.log("[create-label] Reference lengths (sin PII):", {
          origin_before: (config.origin.reference || "Sin referencia").length,
          origin_after: originReference.length,
          destination_before: "Sin referencia".length,
          destination_after: destinationReference.length,
        });
      }

      if (process.env.NODE_ENV !== "production") {
        const hostConfig = getSkydropxApiHosts();
        console.log("[create-label] Quotation reuse snapshot (sin PII):", {
          has_saved_quotation: !!savedQuotationId,
          saved_quotation_id: savedQuotationId || null,
          saved_rate_id: savedRateId || null,
          saved_quotation_host: savedQuotationHost || null,
          quotations_host: hostConfig?.quotationsBaseUrl,
          shipments_host: hostConfig?.restBaseUrl,
          package_used: {
            weight_g: weightG,
            length_cm: lengthCm,
            width_cm: widthCm,
            height_cm: heightCm,
          },
          quoted_package: quotedPackage,
          declared_weight_kg: weightKgPrecise,
        });
      }

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

      if (savedQuotationId && savedRateId) {
        const shipmentPayload = {
          shipment: {
            quotation: { id: savedQuotationId },
            rate_id: savedRateId,
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
              reference: originReference,
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
              reference: destinationReference,
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
          console.log("[create-label] Payload shipments (reuse quotation, sin PII):", {
            quotationId: savedQuotationId,
            rateId: savedRateId,
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
            parsedBody = errorText;
          }
          if (isInvalidQuotationError(response.status, parsedBody)) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[create-label] Quotation inválida/expirada, recotizando...", {
                quotation_id: savedQuotationId,
                status: response.status,
              });
            }
          } else {
            const error = new Error("Skydropx rechazó el envío con quotation existente");
            (error as Error & { statusCode?: number; details?: unknown }).statusCode =
              response.status;
            (error as Error & { details?: unknown }).details = parsedBody;
            throw error;
          }
        } else {
          selectedRateForShipment = {
            rate: { id: savedRateId } as SkydropxQuotationRate,
            rateId: savedRateId,
            provider: rateMeta?.provider || null,
            service: rateMeta?.service || null,
            priceCents: null,
            etaMinDays: typeof rateMeta?.eta_min_days === "number" ? rateMeta.eta_min_days : null,
            etaMaxDays: typeof rateMeta?.eta_max_days === "number" ? rateMeta.eta_max_days : null,
            etaPolicy: "unknown",
            source: "exact",
            matchedBy: "id",
          };

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
            quotationId: savedQuotationId,
            rateId: savedRateId,
          };
        }
      }

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

      const hostConfig = getSkydropxApiHosts();
      const resolveQuotationHost = (host: string | undefined, source: string | undefined) => {
        if (!host) return "https://pro.skydropx.com";
        try {
          const parsed = new URL(host);
          if (parsed.hostname.toLowerCase() === "pro.skydropx.com") {
            return parsed.origin;
          }
          if (process.env.NODE_ENV !== "production") {
            console.warn("[create-label] Quotations host inválido, usando pro.skydropx.com", {
              host: parsed.hostname,
              source: source || "unknown",
            });
          }
          return "https://pro.skydropx.com";
        } catch {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[create-label] Quotations host inválido (parse error), usando pro.skydropx.com", {
              host: host,
              source: source || "unknown",
            });
          }
          return "https://pro.skydropx.com";
        }
      };
      const primaryHost = resolveQuotationHost(
        hostConfig?.quotationsBaseUrl,
        hostConfig?.sources?.quotationsBaseUrl,
      );
      const fallbackHost = "https://pro.skydropx.com";
      const shouldTryFallback = primaryHost !== fallbackHost;

      const attemptQuotation = async (host: string, label: "primary" | "fallback") => {
        const quotationResult = await createQuotation(quotationPayload, {
          baseUrlOverride: host,
          logLabel: label,
        });
        const quotationId: string | null =
          quotationResult.ok
            ? quotationResult.quotationId ||
              quotationResult.data?.id ||
              quotationResult.data?.quotation?.id ||
              null
            : quotationResult.quotationId || null;
        let quotationSnapshot = quotationResult.ok ? quotationResult.data : null;
        let rates = extractQuotationRates(quotationSnapshot);
        let pollingInfo: { attempts: number; lastIsCompleted: boolean; lastError: string | null } | null =
          null;

        if (!quotationResult.ok) {
          if (quotationResult.code === "quotation_pending" && quotationId) {
            // Continuar con polling explícito para obtener rates
            const waited = await waitForQuotationRates(quotationId, {
              maxAttempts: 8,
              delayMs: 700,
              baseUrlOverride: host,
            });
            quotationSnapshot = waited.quotation;
            rates = waited.rates;
            pollingInfo = {
              attempts: waited.attempts,
              lastIsCompleted: waited.isCompleted,
              lastError: waited.lastError,
            };
          } else {
            const error = new Error("Skydropx rechazó la cotización con paquete final");
            const isBadRequest = quotationResult.code === "invalid_params";
            (error as Error & { code?: string; details?: unknown; statusCode?: number }).code = isBadRequest
              ? "skydropx_bad_request"
              : "skydropx_error";
            (error as Error & { statusCode?: number }).statusCode = isBadRequest ? 400 : undefined;
            (error as Error & { details?: unknown }).details = quotationResult.errors;
            throw error;
          }
        }

        if (quotationId && rates.length === 0) {
          const waited = await waitForQuotationRates(quotationId, {
            maxAttempts: 8,
            delayMs: 700,
            baseUrlOverride: host,
          });
          quotationSnapshot = waited.quotation;
          rates = waited.rates;
          pollingInfo = {
            attempts: waited.attempts,
            lastIsCompleted: waited.isCompleted,
            lastError: waited.lastError,
          };
        }

        const isCompleted = Boolean(
          quotationSnapshot?.is_completed ?? quotationSnapshot?.quotation?.is_completed ?? false,
        );

        if (process.env.NODE_ENV !== "production") {
          console.log("[create-label] Quotation polling:", {
            quotation_id: quotationId,
            host,
            host_role: label,
            attempts: pollingInfo?.attempts ?? 0,
            is_completed: isCompleted,
            rates_count: rates.length,
          });
        }

        return {
          quotationId,
          quotationSnapshot,
          rates,
          pollingInfo,
          isCompleted,
          host,
          hostRole: label,
        };
      };

      const primaryAttempt = await attemptQuotation(primaryHost, "primary");
      let activeAttempt = primaryAttempt;
      let fallbackAttempt: Awaited<ReturnType<typeof attemptQuotation>> | null = null;

      if (primaryAttempt.isCompleted && primaryAttempt.rates.length === 0 && shouldTryFallback) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[create-label] No rates en host primario, intentando fallback", {
            primary_host: primaryHost,
            fallback_host: fallbackHost,
            primary_quotation_id: primaryAttempt.quotationId,
            attempts: primaryAttempt.pollingInfo?.attempts ?? 0,
            is_completed: primaryAttempt.isCompleted,
            rates_count: primaryAttempt.rates.length,
          });
        }
        fallbackAttempt = await attemptQuotation(fallbackHost, "fallback");
        if (fallbackAttempt.rates.length > 0) {
          activeAttempt = fallbackAttempt;
        }
      }

      const quotationId = activeAttempt.quotationId;
      const quotationSnapshot = activeAttempt.quotationSnapshot;
      const rates = activeAttempt.rates;
      const pollingInfo = activeAttempt.pollingInfo;

      if (!quotationId || rates.length === 0) {
        const lastIsCompleted = Boolean(
          quotationSnapshot?.is_completed ?? quotationSnapshot?.quotation?.is_completed ?? false,
        );
        const errorDetail =
          (quotationSnapshot as { data?: { attributes?: { error_detail?: string } } })?.data
            ?.attributes?.error_detail ||
          (quotationSnapshot as { error_detail?: string })?.error_detail ||
          null;
        const error = new Error("Skydropx no devolvió tarifas para la cotización.");
        (error as Error & { code?: string; statusCode?: number; details?: unknown }).code =
          "skydropx_no_rates";
        (error as Error & { statusCode?: number }).statusCode = 502;
        (error as Error & { details?: unknown }).details = {
          quotation_id: quotationId,
          host_used: activeAttempt.host,
          host_role: activeAttempt.hostRole,
          fallback_attempted: shouldTryFallback,
          fallback_quotation_id: fallbackAttempt?.quotationId || null,
          fallback_is_completed: fallbackAttempt?.isCompleted ?? null,
          fallback_rates_count: fallbackAttempt?.rates.length ?? null,
          primary_host: primaryHost,
          fallback_host: fallbackHost,
          attempts: pollingInfo?.attempts ?? 0,
          last_is_completed: lastIsCompleted,
          last_error_detail: pollingInfo?.lastError ?? errorDetail,
          rates_count: rates.length,
        };
        throw error;
      }

      const selectRateFromQuotation = ({
        quotationRates,
        orderRateId,
        orderRateMeta,
        customerEtaMax,
      }: {
        quotationRates: SkydropxQuotationRate[];
        orderRateId?: string | null;
        orderRateMeta?: {
          provider?: string;
          service?: string;
          external_id?: string;
          eta_min_days?: number | null;
          eta_max_days?: number | null;
        };
        customerEtaMax?: number | null;
      }): RateSelection => {
        const rateCandidates = [
          orderRateId?.trim() || null,
          orderRateMeta?.external_id?.trim() || null,
        ].filter(Boolean) as string[];

        const normalizedProvider = normalizeText(orderRateMeta?.provider);
        const normalizedService = normalizeText(orderRateMeta?.service);

        const rateEntries = quotationRates.map((rate) => {
          const { etaMin, etaMax } = getRateEta(rate);
          return {
            rate,
            rateId: getRateId(rate) || rate.id,
            provider: getRateProvider(rate),
            service: getRateService(rate),
            priceValue: getRatePriceValue(rate),
            etaMinDays: etaMin,
            etaMaxDays: etaMax,
          };
        });

        const pickCheapest = (entries: typeof rateEntries): (typeof rateEntries)[number] => {
          const withPrice = entries.filter((entry) => typeof entry.priceValue === "number");
          const sorted = withPrice.length > 0 ? withPrice : entries;
          return (
            sorted.sort((a, b) => {
              const priceA = a.priceValue ?? Number.MAX_SAFE_INTEGER;
              const priceB = b.priceValue ?? Number.MAX_SAFE_INTEGER;
              if (priceA !== priceB) return priceA - priceB;
              const etaA = a.etaMaxDays ?? Number.MAX_SAFE_INTEGER;
              const etaB = b.etaMaxDays ?? Number.MAX_SAFE_INTEGER;
              return etaA - etaB;
            })[0] || entries[0]
          );
        };

        if (typeof customerEtaMax === "number") {
          const etaCandidates = rateEntries.filter(
            (entry) => typeof entry.etaMaxDays === "number" && entry.etaMaxDays <= customerEtaMax,
          );
          if (etaCandidates.length > 0) {
            const chosen = pickCheapest(etaCandidates);
            return {
              rate: chosen.rate,
              rateId: chosen.rateId,
              provider: chosen.provider,
              service: chosen.service,
              priceCents: chosen.priceValue ? Math.round(chosen.priceValue * 100) : null,
              etaMinDays: chosen.etaMinDays,
              etaMaxDays: chosen.etaMaxDays,
              etaPolicy: "same_or_better",
              source: "eta",
              matchedBy: "eta",
            };
          }

          const providerServiceMatch =
            normalizedProvider && normalizedService
              ? rateEntries.find((entry) => {
                  const provider = normalizeText(entry.provider);
                  const service = normalizeText(entry.service);
                  return provider === normalizedProvider && service === normalizedService;
                })
              : undefined;

          if (providerServiceMatch) {
            return {
              rate: providerServiceMatch.rate,
              rateId: providerServiceMatch.rateId,
              provider: providerServiceMatch.provider,
              service: providerServiceMatch.service,
              priceCents: providerServiceMatch.priceValue
                ? Math.round(providerServiceMatch.priceValue * 100)
                : null,
              etaMinDays: providerServiceMatch.etaMinDays,
              etaMaxDays: providerServiceMatch.etaMaxDays,
              etaPolicy: "fallback_provider_service",
              source: "provider_service",
              matchedBy: "provider_service",
            };
          }

          const fallback = pickCheapest(rateEntries);
          return {
            rate: fallback.rate,
            rateId: fallback.rateId,
            provider: fallback.provider,
            service: fallback.service,
            priceCents: fallback.priceValue ? Math.round(fallback.priceValue * 100) : null,
            etaMinDays: fallback.etaMinDays,
            etaMaxDays: fallback.etaMaxDays,
            etaPolicy: "fallback_cheapest",
            source: "fallback",
            matchedBy: "fallback",
          };
        }

        const exactMatch = rateCandidates.length
          ? rateEntries.find((entry) => entry.rateId && rateCandidates.includes(entry.rateId))
          : undefined;

        if (exactMatch) {
          return {
            rate: exactMatch.rate,
            rateId: exactMatch.rateId,
            provider: exactMatch.provider,
            service: exactMatch.service,
            priceCents: exactMatch.priceValue ? Math.round(exactMatch.priceValue * 100) : null,
            etaMinDays: exactMatch.etaMinDays,
            etaMaxDays: exactMatch.etaMaxDays,
            etaPolicy: "unknown",
            source: "exact",
            matchedBy: "id",
          };
        }

        const providerServiceMatch =
          normalizedProvider && normalizedService
            ? rateEntries.find((entry) => {
                const provider = normalizeText(entry.provider);
                const service = normalizeText(entry.service);
                return provider === normalizedProvider && service === normalizedService;
              })
            : undefined;

        if (providerServiceMatch) {
          return {
            rate: providerServiceMatch.rate,
            rateId: providerServiceMatch.rateId,
            provider: providerServiceMatch.provider,
            service: providerServiceMatch.service,
            priceCents: providerServiceMatch.priceValue
              ? Math.round(providerServiceMatch.priceValue * 100)
              : null,
            etaMinDays: providerServiceMatch.etaMinDays,
            etaMaxDays: providerServiceMatch.etaMaxDays,
            etaPolicy: "unknown",
            source: "provider_service",
            matchedBy: "provider_service",
          };
        }

        const fallback = pickCheapest(rateEntries);
        return {
          rate: fallback.rate,
          rateId: fallback.rateId,
          provider: fallback.provider,
          service: fallback.service,
          priceCents: fallback.priceValue ? Math.round(fallback.priceValue * 100) : null,
          etaMinDays: fallback.etaMinDays,
          etaMaxDays: fallback.etaMaxDays,
          etaPolicy: "unknown",
          source: "fallback",
          matchedBy: "fallback",
        };
      };

      const customerEtaMax =
        typeof order.shipping_eta_max_days === "number"
          ? order.shipping_eta_max_days
          : typeof rateMeta?.eta_max_days === "number"
            ? rateMeta.eta_max_days
            : null;

      const rateSelection = selectRateFromQuotation({
        quotationRates: rates,
        orderRateId: savedRateId,
        orderRateMeta: rateMeta,
        customerEtaMax,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[create-label] Rate selection (eta-aware):", {
          orderId,
          quotation_id: quotationId,
          rates_count: rates.length,
          customer_eta_max_days: customerEtaMax,
          selected_rate_id: rateSelection.rateId,
          select_source: rateSelection.source,
          matched_by: rateSelection.matchedBy,
          eta_policy: rateSelection.etaPolicy,
          selected_eta_max_days: rateSelection.etaMaxDays,
          price_cents: rateSelection.priceCents,
        });
      }
      if (!rateSelection.rateId) {
        const sampleRateIds = rates
          .map((rate) => getRateId(rate))
          .filter((rateId): rateId is string => Boolean(rateId))
          .slice(0, 3);
        const error = new Error(
          "No se pudo mapear la tarifa seleccionada en la cotización de Skydropx.",
        );
        (error as Error & { code?: string; details?: unknown }).code = "rate_id_no_encontrado";
        (error as Error & { details?: unknown }).details = {
          shipping_rate_ext_id: order.shipping_rate_ext_id || null,
          expected_provider: rateMeta?.provider || null,
          expected_service: rateMeta?.service || null,
          rates_count: rates.length,
          sample_rate_ids: sampleRateIds,
        };
        throw error;
      }
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
            reference: originReference,
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
            reference: destinationReference,
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
          eta_min_days:
            typeof selectedRate.etaMinDays === "number"
              ? selectedRate.etaMinDays
              : (earlyRateMeta.eta_min_days as number | null | undefined) ?? null,
          eta_max_days:
            typeof selectedRate.etaMaxDays === "number"
              ? selectedRate.etaMaxDays
              : (earlyRateMeta.eta_max_days as number | null | undefined) ?? null,
        },
        rate_used: {
          rate_id: selectedRate.rateId,
          external_rate_id: selectedRate.rateId,
          provider: selectedRate.provider,
          service: selectedRate.service,
          eta_min_days: selectedRate.etaMinDays,
          eta_max_days: selectedRate.etaMaxDays,
          carrier_cents: selectedRate.priceCents,
          price_cents: selectedRate.priceCents,
          selection_source: "admin",
          eta_policy: selectedRate.etaPolicy,
          eta_changed:
            selectedRate.etaPolicy === "fallback_provider_service" ||
            selectedRate.etaPolicy === "fallback_cheapest",
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

        const weightRaw =
          dataAttributes.weight ||
          dataAttributes.declared_weight ||
          firstIncludedAttrs.weight ||
          firstIncludedAttrs.declared_weight ||
          firstParcel.weight ||
          null;
        const weightParsed =
          typeof weightRaw === "number"
            ? weightRaw
            : typeof weightRaw === "string"
              ? parseFloat(weightRaw)
              : null;
        const packageUsedWeightKg = typeof weightG === "number" ? weightG / 1000 : null;
        const resolvedWeightKg =
          (typeof weightParsed === "number" && Number.isFinite(weightParsed) ? weightParsed : null) ??
          (typeof packageUsedWeightKg === "number" ? packageUsedWeightKg : null) ??
          null;

        const weightUnit =
          dataAttributes.mass_unit ||
          dataAttributes.weight_unit ||
          firstIncludedAttrs.mass_unit ||
          firstIncludedAttrs.weight_unit ||
          (resolvedWeightKg !== null ? "kg" : null);
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
          weight: resolvedWeightKg,
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
      eta_min_days:
        typeof selectedRate.etaMinDays === "number" ? selectedRate.etaMinDays : existingRateMeta.eta_min_days ?? null,
      eta_max_days:
        typeof selectedRate.etaMaxDays === "number" ? selectedRate.etaMaxDays : existingRateMeta.eta_max_days ?? null,
    };
    const updatedShippingMeta = {
      ...finalShippingMeta, // Preservar datos existentes (cancel_request_id, cancel_status, etc.)
      shipment_id: shipmentResult.rawId || finalShippingMeta.shipment_id || null, // SIEMPRE guardar/actualizar shipment_id
      quotation_id: shipmentResult.quotationId || finalShippingMeta.quotation_id || null,
      rate_id: selectedRate.rateId,
      rate: updatedRateMeta,
      rate_used: {
        rate_id: selectedRate.rateId,
        external_rate_id: selectedRate.rateId,
        provider: selectedRate.provider,
        service: selectedRate.service,
        eta_min_days: selectedRate.etaMinDays,
        eta_max_days: selectedRate.etaMaxDays,
        carrier_cents: selectedRate.priceCents,
        price_cents: selectedRate.priceCents,
        selection_source: "admin",
        eta_policy: selectedRate.etaPolicy,
        eta_changed:
          selectedRate.etaPolicy === "fallback_provider_service" ||
          selectedRate.etaPolicy === "fallback_cheapest",
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

    const existingPricing = (finalMetadata.shipping_pricing as Record<string, unknown>) || null;
    const resolvedPricing = resolveShippingPricing(
      existingPricing,
      typeof selectedRate.priceCents === "number" ? selectedRate.priceCents : null,
      selectedRate.etaMinDays ?? null,
      selectedRate.etaMaxDays ?? null,
    );

    const updatedMetadata: Record<string, unknown> = {
      ...finalMetadata, // Preservar todos los campos existentes
      shipping_pricing: resolvedPricing ?? finalMetadata.shipping_pricing,
      shipping: {
        ...updatedShippingMeta,
        price_cents:
          typeof resolvedPricing?.total_cents === "number"
            ? resolvedPricing.total_cents
            : (updatedShippingMeta as { price_cents?: number }).price_cents ?? null,
        option_code:
          (updatedShippingMeta.rate as { option_code?: string | null } | undefined)?.option_code ??
          (updatedShippingMeta as { option_code?: string | null }).option_code ??
          null,
        ...(labelCreationPayload
          ? {
              label_creation: {
                status: "created",
                started_at: labelCreationPayload.started_at,
                finished_at: new Date().toISOString(),
                request_id: labelCreationRequestId,
              },
            }
          : {}),
      },
    };
    const normalizedMeta = normalizeShippingMetadata(updatedMetadata, {
      source: "create-label",
      orderId,
    });
    if (normalizedMeta.shippingPricing) {
      updatedMetadata.shipping_pricing = normalizedMeta.shippingPricing;
    }
    updatedMetadata.shipping = normalizedMeta.shippingMeta as Record<string, unknown>;

    // Determinar shipping_status según disponibilidad de tracking/label
    let shippingStatus: string;
    if (shipmentResult.trackingNumber && shipmentResult.labelUrl) {
      shippingStatus = "label_created";
    } else if (shipmentResult.trackingNumber || shipmentResult.labelUrl) {
      shippingStatus = "label_pending_tracking";
    } else {
      shippingStatus = "label_pending_tracking"; // Si no hay ninguno, está pendiente
    }

    const nowIso = new Date().toISOString();
    // Actualizar la orden con tracking y label (si están disponibles)
    // IMPORTANTE: SIEMPRE guardar shipment_id en metadata Y columna shipping_shipment_id
    const shipmentIdToSave = shipmentResult.rawId || finalShippingMeta.shipment_id || null;
    const updateData: Record<string, unknown> = {
      metadata: updatedMetadata, // Merge seguro de metadata (incluye shipment_id SIEMPRE)
      shipping_status: shippingStatus,
      shipping_status_updated_at: nowIso,
      updated_at: nowIso,
    };

    if (resolvedPricing?.total_cents && typeof resolvedPricing.total_cents === "number") {
      updateData.shipping_price_cents = resolvedPricing.total_cents;
    }

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

    // Enviar email de envío generado solo si hay evidencia de guía (label_url) o estado label_created
    if (
      !updateError &&
      (shipmentResult.labelUrl ||
        shippingStatus === "label_created" ||
        updatedMetadata.shipping_label_url)
    ) {
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

    try {
      if (labelCreationPayload && labelCreationRequestId && supabaseClient && orderIdForError) {
        const metadata = (orderForError?.metadata as Record<string, unknown>) || {};
        const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
        await supabaseClient
          .from("orders")
          .update({
            metadata: {
              ...metadata,
              shipping: {
                ...shippingMeta,
                label_creation: {
                  status: "failed",
                  started_at: labelCreationPayload.started_at,
                  finished_at: new Date().toISOString(),
                  request_id: labelCreationRequestId,
                  error_code: errorCode || "unknown_error",
                },
              },
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderIdForError);
      }
    } catch (updateError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[create-label] No se pudo actualizar label_creation:", updateError);
      }
    }

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
                const shippingAddressResult = getOrderShippingAddress(tempOrder, {
                  requireName: true,
                });
                const addressTo = shippingAddressResult
                  ? {
                      postalCode: shippingAddressResult.address.postalCode,
                      state: shippingAddressResult.address.state,
                      city: shippingAddressResult.address.city,
                      address1: shippingAddressResult.address.address1,
                      name: shippingAddressResult.address.name ?? "Cliente",
                      phone: shippingAddressResult.address.phone ?? null,
                    }
                  : null;
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

