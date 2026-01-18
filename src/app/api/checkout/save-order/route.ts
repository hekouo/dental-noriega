import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createActionSupabase } from "@/lib/supabase/server-actions";
import { estimatePackageWeight } from "@/lib/shipping/estimatePackageWeight";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Schema Zod para validación
const OrderItemSchema = z.object({
  productId: z.string().uuid().optional(),
  title: z.string().min(1),
  qty: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  image_url: z.string().url().optional().nullable(),
  variant_detail: z.string().optional().nullable(), // Detalle de variantes (color, medidas, etc.)
});

const SaveOrderRequestSchema = z.object({
  order_id: z.string().uuid(),
  email: z.string().email(),
  items: z.array(OrderItemSchema).min(1),
  total_cents: z.number().int().positive(),
  status: z.enum(["pending", "paid", "failed", "canceled"]),
  payment_provider: z.string().default("stripe"),
  payment_id: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  whatsappConfirmed: z.boolean().optional().default(false),
  shippingAddressConfirmed: z.boolean().optional().default(false),
});

// TODO: Refactor this function to reduce cognitive complexity. Rule temporarily disabled to keep CI passing.
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function POST(req: NextRequest) {
  noStore();
  try {
    const body = await req.json().catch(() => null);
    
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Datos inválidos: se espera un objeto JSON" },
        { status: 422 },
      );
    }

    // Validar con Zod
    const validationResult = SaveOrderRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      console.warn("[save-order] Validación fallida:", errors);
      return NextResponse.json(
        { error: `Datos inválidos: ${errors}` },
        { status: 422 },
      );
    }

    const orderData = validationResult.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error("[save-order] NEXT_PUBLIC_SUPABASE_URL no está configurado");
      return NextResponse.json(
        { error: "No se pudo guardar la orden: configuración de Supabase incompleta" },
        { status: 500 },
      );
    }

    if (!serviceRoleKey) {
      console.error("[save-order] SUPABASE_SERVICE_ROLE_KEY no está configurado");
      return NextResponse.json(
        { error: "No se pudo guardar la orden: falta clave de servicio de Supabase" },
        { status: 500 },
      );
    }

    // Intentar obtener user_id de la sesión
    let user_id: string | null = null;
    try {
      const authSupabase = createActionSupabase();
      const {
        data: { user },
      } = await authSupabase.auth.getUser();
      user_id = user?.id ?? null;
    } catch {
      // Si no hay sesión, continuar como guest (user_id = null)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar si la orden ya existe
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderData.order_id)
      .single();

    // Construir metadata limpia y consistente con toda la información adicional
    // IMPORTANTE: metadata debe tener estructura clara para facilitar queries en Supabase
    const metadataFromPayload = orderData.metadata || {};
    
    // Extraer valores del metadata recibido o calcularlos
    let subtotalCents: number;
    if (typeof metadataFromPayload.subtotal_cents === "number") {
      subtotalCents = metadataFromPayload.subtotal_cents;
    } else {
      const shippingCost = typeof metadataFromPayload.shipping_cost_cents === "number"
        ? metadataFromPayload.shipping_cost_cents
        : 0;
      const discountCents = typeof metadataFromPayload.discount_cents === "number"
        ? metadataFromPayload.discount_cents
        : 0;
      subtotalCents = orderData.total_cents - shippingCost + discountCents;
    }
    
    // Obtener shipping_cost_cents del payload o del metadata existente de la orden
    let shippingCostCents = typeof metadataFromPayload.shipping_cost_cents === "number"
      ? metadataFromPayload.shipping_cost_cents
      : undefined;
    
    // Si no viene en el payload y la orden ya existe, intentar obtenerlo del metadata existente
    if (shippingCostCents === undefined && existingOrder) {
      const { data: existingOrderData } = await supabase
        .from("orders")
        .select("metadata")
        .eq("id", orderData.order_id)
        .single();
      
      if (existingOrderData?.metadata) {
        const existingMetadata = existingOrderData.metadata as Record<string, unknown>;
        if (typeof existingMetadata.shipping_cost_cents === "number") {
          shippingCostCents = existingMetadata.shipping_cost_cents;
        }
      }
    }
    
    // Si aún no tenemos shipping_cost_cents, usar 0 como fallback
    if (shippingCostCents === undefined) {
      shippingCostCents = 0;
    }
    
    const discountCents = typeof metadataFromPayload.discount_cents === "number"
      ? metadataFromPayload.discount_cents
      : 0;
    
    const couponCode = typeof metadataFromPayload.coupon_code === "string"
      ? metadataFromPayload.coupon_code
      : null;
    
    const shippingMethod = typeof metadataFromPayload.shipping_method === "string"
      ? metadataFromPayload.shipping_method
      : null;
    
    // Validar datos de loyalty si están presentes en metadata
    let loyaltyData = metadataFromPayload.loyalty as
      | {
          applied?: boolean;
          pointsToSpend?: number;
          discountPercent?: number;
          discountCents?: number;
          balanceBefore?: number;
        }
      | undefined;
    
    // Si hay datos de loyalty y está aplicado, validar que el usuario tenga puntos suficientes
    if (loyaltyData?.applied && orderData.email) {
      try {
        const { getLoyaltySummaryByEmail } = await import("@/lib/loyalty/points.server");
        const { LOYALTY_MIN_POINTS_FOR_DISCOUNT } = await import("@/lib/loyalty/config");
        
        const loyaltySummary = await getLoyaltySummaryByEmail(orderData.email);
        
        // Si no tiene puntos suficientes, ignorar el descuento
        if (!loyaltySummary || loyaltySummary.pointsBalance < LOYALTY_MIN_POINTS_FOR_DISCOUNT) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[save-order] Intentando aplicar descuento sin puntos suficientes:", {
              email: orderData.email,
              pointsBalance: loyaltySummary?.pointsBalance || 0,
              required: LOYALTY_MIN_POINTS_FOR_DISCOUNT,
            });
          }
          // No incluir datos de loyalty en metadata si no tiene puntos suficientes
          loyaltyData = undefined;
        } else {
          // Validar que los puntos a gastar sean correctos
          if (loyaltyData.pointsToSpend !== LOYALTY_MIN_POINTS_FOR_DISCOUNT) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[save-order] Cantidad de puntos incorrecta:", {
                email: orderData.email,
                received: loyaltyData.pointsToSpend,
                expected: LOYALTY_MIN_POINTS_FOR_DISCOUNT,
              });
            }
            // Ajustar a la cantidad correcta
            loyaltyData.pointsToSpend = LOYALTY_MIN_POINTS_FOR_DISCOUNT;
          }
        }
      } catch (loyaltyError) {
        // Si hay error al validar, no aplicar descuento pero no romper la orden
        console.error("[save-order] Error al validar puntos de lealtad:", loyaltyError);
        loyaltyData = undefined;
      }
    } else if (loyaltyData?.applied && !orderData.email) {
      // Si intenta aplicar descuento sin email, ignorar
      if (process.env.NODE_ENV === "development") {
        console.warn("[save-order] Intentando aplicar descuento sin email");
      }
      loyaltyData = undefined;
    }
    
    // Construir metadata limpia y estructurada
    const metadata: Record<string, unknown> = {
      subtotal_cents: subtotalCents,
      shipping_cost_cents: shippingCostCents,
      discount_cents: discountCents,
      coupon_code: couponCode,
      shipping_method: shippingMethod,
      items_count: orderData.items.length,
      // Información de contacto (si está disponible)
      contact_name: metadataFromPayload.contact_name || null,
      contact_email: metadataFromPayload.contact_email || orderData.email || null,
      contact_phone: metadataFromPayload.contact_phone || null,
      contact_address: metadataFromPayload.contact_address || null,
      contact_city: metadataFromPayload.contact_city || null,
      contact_state: metadataFromPayload.contact_state || null,
      contact_cp: metadataFromPayload.contact_cp || null,
      // Confirmaciones (preservar existentes o usar nuevos valores)
      whatsapp_confirmed: metadataFromPayload.whatsapp_confirmed ?? orderData.whatsappConfirmed ?? false,
      shipping_address_confirmed: metadataFromPayload.shipping_address_confirmed ?? orderData.shippingAddressConfirmed ?? false,
    };

    // Guardar dirección de envío en metadata.shipping_address (merge seguro, preservar si ya existe)
    if (metadataFromPayload.shipping_address && typeof metadataFromPayload.shipping_address === "object") {
      metadata.shipping_address = metadataFromPayload.shipping_address;
    } else if (metadataFromPayload.contact_address && metadataFromPayload.contact_city && metadataFromPayload.contact_state && metadataFromPayload.contact_cp) {
      // Fallback: construir desde campos legacy si shipping_address no existe
      metadata.shipping_address = {
        name: metadataFromPayload.contact_name || null,
        phone: metadataFromPayload.contact_phone || null,
        email: metadataFromPayload.contact_email || orderData.email || null,
        address1: metadataFromPayload.contact_address || "",
        address2: null,
        city: metadataFromPayload.contact_city || "",
        state: metadataFromPayload.contact_state || "",
        postal_code: metadataFromPayload.contact_cp || "",
        country: "MX",
      };
    }

    // Items detallados (opcional, para referencia)
    metadata.items = orderData.items.map((item) => ({
      productId: item.productId,
      title: item.title,
      qty: item.qty,
      unitPriceCents: item.unitPriceCents,
      image_url: item.image_url,
    }));

    // Calcular peso estimado del paquete (solo si hay items con product_id)
    // Solo calcular si NO existe ya shipping_package_estimated (no sobreescribir)
    if (!metadataFromPayload.shipping_package_estimated && orderData.items.length > 0) {
      const BASE_PACKAGE_WEIGHT_G = 1200; // caja + relleno + cinta
      const defaultLengthCm = 25;
      const defaultWidthCm = 20;
      const defaultHeightCm = 15;
      const productIds = orderData.items
        .map((item) => item.productId)
        .filter((id): id is string => !!id);

      if (productIds.length > 0) {
        try {
          // Obtener pesos de productos desde DB
          const { data: products } = await supabase
            .from("products")
            .select("id, shipping_weight_g")
            .in("id", productIds);

          const productsMap = new Map<string, number | null>();
          products?.forEach((p) => {
            productsMap.set(p.id, p.shipping_weight_g);
          });

          const defaultItemWeightG = parseInt(
            process.env.DEFAULT_ITEM_WEIGHT_G || "100",
            10,
          );

          const estimated = await estimatePackageWeight(
            orderData.items.map((item) => ({
              product_id: item.productId || null,
              qty: item.qty,
            })),
            productsMap,
            defaultItemWeightG,
          );

          // Clamp a mínimo 1kg (Skydropx requiere mínimo 1kg)
          const MIN_BILLABLE_WEIGHT_G = parseInt(
            process.env.SKYDROPX_MIN_BILLABLE_WEIGHT_G || "1000",
            10,
          );
          const estimatedWithBase = estimated.weight_g + BASE_PACKAGE_WEIGHT_G;
          const finalWeightG = Math.max(estimatedWithBase, MIN_BILLABLE_WEIGHT_G);

          metadata.shipping_package_estimated = {
            weight_g: finalWeightG,
            length_cm: defaultLengthCm,
            width_cm: defaultWidthCm,
            height_cm: defaultHeightCm,
            base_weight_g: BASE_PACKAGE_WEIGHT_G,
            source: estimated.source,
            fallback_used_count: estimated.fallback_used_count,
            was_clamped: finalWeightG > estimatedWithBase,
          };

          const currentShippingMeta = (metadata.shipping as Record<string, unknown>) || {};
          metadata.shipping = {
            ...currentShippingMeta,
            estimated_package: {
              weight_g: finalWeightG,
              length_cm: defaultLengthCm,
              width_cm: defaultWidthCm,
              height_cm: defaultHeightCm,
              base_weight_g: BASE_PACKAGE_WEIGHT_G,
              source: estimated.source,
              fallback_used_count: estimated.fallback_used_count,
              was_clamped: finalWeightG > estimatedWithBase,
            },
          };
        } catch (error) {
          // Si falla el cálculo, usar fallback pero no romper la orden
          if (process.env.NODE_ENV !== "production") {
            console.warn("[save-order] Error al calcular peso estimado:", error);
          }
          const MIN_BILLABLE_WEIGHT_G = parseInt(
            process.env.SKYDROPX_MIN_BILLABLE_WEIGHT_G || "1000",
            10,
          );
          const fallbackWeightG = Math.max(BASE_PACKAGE_WEIGHT_G, MIN_BILLABLE_WEIGHT_G);
          metadata.shipping_package_estimated = {
            weight_g: fallbackWeightG,
            length_cm: defaultLengthCm,
            width_cm: defaultWidthCm,
            height_cm: defaultHeightCm,
            base_weight_g: BASE_PACKAGE_WEIGHT_G,
            source: "fallback",
            fallback_used_count: orderData.items.reduce((sum, item) => sum + item.qty, 0),
            was_clamped: fallbackWeightG > BASE_PACKAGE_WEIGHT_G,
          };

          const currentShippingMeta = (metadata.shipping as Record<string, unknown>) || {};
          metadata.shipping = {
            ...currentShippingMeta,
            estimated_package: {
              weight_g: fallbackWeightG,
              length_cm: defaultLengthCm,
              width_cm: defaultWidthCm,
              height_cm: defaultHeightCm,
              base_weight_g: BASE_PACKAGE_WEIGHT_G,
              source: "fallback",
              fallback_used_count: orderData.items.reduce((sum, item) => sum + item.qty, 0),
              was_clamped: fallbackWeightG > BASE_PACKAGE_WEIGHT_G,
            },
          };
        }
      }
    }

    // Preparar datos de shipping: priorizar Skydropx si está disponible, sino usar método manual
    let shippingProvider: string | null = null;
    let shippingServiceName: string | null = null;
    let shippingRateExtId: string | null = null;
    let shippingEtaMinDays: number | null = null;
    let shippingEtaMaxDays: number | null = null;
    let shippingPriceCents: number | null = null;
    
    if (metadataFromPayload.shipping && typeof metadataFromPayload.shipping === "object") {
      // Caso Skydropx
      const shippingData = metadataFromPayload.shipping as {
        provider?: string;
        rate?: {
          external_id?: string;
          service?: string;
          eta_min_days?: number | null;
          eta_max_days?: number | null;
        };
        price_cents?: number;
        pricing?: {
          carrier_cents?: number;
          packaging_cents?: number;
          margin_cents?: number;
          total_cents?: number;
        };
        package_used?: {
          weight_g: number;
          length_cm: number;
          width_cm: number;
          height_cm: number;
          source?: string;
        };
      };
      
      metadata.shipping = metadataFromPayload.shipping;
      if (shippingData.pricing) {
        metadata.shipping_pricing = shippingData.pricing;
      }
      if (shippingData.package_used) {
        const currentShippingMeta = (metadata.shipping as Record<string, unknown>) || {};
        metadata.shipping = {
          ...currentShippingMeta,
          package_used: shippingData.package_used,
        };
      }
      
      // Extraer campos para guardar en columnas
      shippingProvider = shippingData.provider || "skydropx";
      shippingServiceName = shippingData.rate?.service || null;
      shippingRateExtId = shippingData.rate?.external_id || null;
      shippingEtaMinDays = shippingData.rate?.eta_min_days ?? null;
      shippingEtaMaxDays = shippingData.rate?.eta_max_days ?? null;
      shippingPriceCents =
        typeof shippingData.pricing?.total_cents === "number"
          ? shippingData.pricing.total_cents
          : shippingData.price_cents || null;
    } else if (shippingMethod === "pickup") {
      // Caso "Recoger en tienda"
      shippingProvider = "pickup";
      shippingServiceName = "Recoger en tienda";
      shippingPriceCents = 0;
      // shippingRateExtId, shippingEtaMinDays, shippingEtaMaxDays quedan null
    } else if (shippingMethod) {
      // Caso método manual (standard/express) sin Skydropx
      shippingProvider = "manual";
      shippingServiceName = shippingMethod === "standard" ? "Envío estándar" : "Envío express";
      shippingPriceCents = shippingCostCents;
      // shippingRateExtId, shippingEtaMinDays, shippingEtaMaxDays quedan null
    }
    
    // Incluir datos de loyalty solo si pasaron la validación
    if (loyaltyData) {
      metadata.loyalty = loyaltyData;
    }

    if (existingOrder) {
      // Procesar puntos de lealtad si la orden está siendo marcada como "paid"
      // El helper processLoyaltyForOrder es idempotente y maneja todo el flujo
      if (orderData.status === "paid") {
        try {
          const { processLoyaltyForOrder } = await import("@/lib/loyalty/processOrder.server");
          await processLoyaltyForOrder(orderData.order_id);
        } catch (loyaltyError) {
          // No fallar la orden si falla la lógica de puntos
          console.error("[save-order] Error al procesar puntos:", loyaltyError);
        }
      }

      // Obtener metadata actualizada después de procesar puntos (si se procesaron)
      const { data: updatedOrder } = await supabase
        .from("orders")
        .select("metadata")
        .eq("id", orderData.order_id)
        .single();

      const loyaltyMetadata = updatedOrder?.metadata || metadata;

      // Obtener valores actuales de payment_provider y payment_id para no sobreescribir
      const { data: currentOrderData } = await supabase
        .from("orders")
        .select("payment_provider, payment_id")
        .eq("id", orderData.order_id)
        .single();

      // Actualizar orden existente usando el schema real
      // IMPORTANTE: NO eliminamos ni recreamos order_items aquí
      // Los items ya fueron creados en create-order y solo se actualizan si es necesario
      // Solo actualizar payment_provider/payment_id si vienen en orderData Y no están ya establecidos
      const updateData: Record<string, unknown> = {
        user_id: user_id,
        email: orderData.email,
        total_cents: orderData.total_cents,
        status: orderData.status,
        metadata: loyaltyMetadata,
        // Campos de shipping de Skydropx (opcionales)
        shipping_provider: shippingProvider,
        shipping_service_name: shippingServiceName,
        shipping_price_cents: shippingPriceCents,
        shipping_rate_ext_id: shippingRateExtId,
        shipping_eta_min_days: shippingEtaMinDays,
        shipping_eta_max_days: shippingEtaMaxDays,
        // Estado de envío por defecto: "pending"
        shipping_status: "pending",
        updated_at: new Date().toISOString(),
      };

      // Solo actualizar payment_provider si viene en orderData Y la columna está NULL
      if (orderData.payment_provider && !currentOrderData?.payment_provider) {
        updateData.payment_provider = orderData.payment_provider;
      }
      // Solo actualizar payment_id si viene en orderData Y la columna está NULL
      if (orderData.payment_id && !currentOrderData?.payment_id) {
        updateData.payment_id = orderData.payment_id;
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderData.order_id);

      if (updateError) {
        console.error("[save-order] Error al actualizar orden:", {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
          order_id: orderData.order_id,
        });
        return NextResponse.json(
          { error: "No se pudo guardar la orden" },
          { status: 500 },
        );
      }

      // IDEMPOTENCIA CRÍTICA: Verificar si ya existen items para esta orden
      // Si la orden ya está 'paid', NO modificar items ni recalcular montos
      const { data: existingOrderStatus } = await supabase
        .from("orders")
        .select("status")
        .eq("id", orderData.order_id)
        .single();

      const isAlreadyPaid = existingOrderStatus?.status === "paid";

      // Verificar si ya existen items para esta orden
      const { data: existingItems } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", orderData.order_id)
        .limit(1);

      // Solo insertar items si NO existen Y la orden NO está ya pagada (idempotencia)
      if (!existingItems || existingItems.length === 0) {
        if (isAlreadyPaid) {
          // Si ya está pagada y no tiene items, algo está mal pero no insertamos para evitar duplicados
          if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
            console.warn("[save-order] Orden ya pagada sin items, no se insertan items nuevos");
          }
        } else {
        const { variantDetailToJSON } = await import("@/lib/products/parseVariantDetail");
        const orderItems = orderData.items.map((item) => {
          // Convertir variant_detail de string a JSON
          const variantDetailJSON = variantDetailToJSON(item.variant_detail || null);
          return {
            order_id: orderData.order_id,
            product_id: item.productId || null,
            title: item.title,
            unit_price_cents: item.unitPriceCents,
            qty: item.qty,
            image_url: item.image_url || null,
            variant_detail: variantDetailJSON,
          };
        });

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          console.error("[save-order] Error al crear items:", {
            message: itemsError.message,
            details: itemsError.details,
            hint: itemsError.hint,
            code: itemsError.code,
            order_id: orderData.order_id,
            items_count: orderItems.length,
          });
          // No fallar completamente si los items ya existen
          if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
            console.warn("[save-order] Items no insertados (puede que ya existan)");
          }
        }
        }
      } else {
        if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
          console.info("[save-order] Items ya existen para esta orden, no se insertan duplicados");
        }
      }

      return NextResponse.json({
        success: true,
        order_id: orderData.order_id,
      });
    } else {
      // Crear nueva orden usando el schema real

      const { error: insertError } = await supabase
        .from("orders")
        .insert({
          id: orderData.order_id,
          user_id: user_id,
          email: orderData.email,
          total_cents: orderData.total_cents,
          status: orderData.status,
          payment_provider: orderData.payment_provider || "stripe",
          payment_id: orderData.payment_id || null,
          metadata: metadata,
          // Campos de shipping de Skydropx (opcionales)
          shipping_provider: shippingProvider,
          shipping_service_name: shippingServiceName,
          shipping_price_cents: shippingPriceCents,
          shipping_rate_ext_id: shippingRateExtId,
          shipping_eta_min_days: shippingEtaMinDays,
          shipping_eta_max_days: shippingEtaMaxDays,
          // Estado de envío por defecto: "pending"
          shipping_status: "pending",
        });

      if (insertError) {
        console.error("[save-order] Error al crear orden:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          order_id: orderData.order_id,
          email: orderData.email,
        });
        return NextResponse.json(
          { error: "No se pudo guardar la orden" },
          { status: 500 },
        );
      }

      // Procesar puntos de lealtad si la orden se crea con status "paid"
      // El helper processLoyaltyForOrder es idempotente y maneja todo el flujo
      if (orderData.status === "paid") {
        try {
          const { processLoyaltyForOrder } = await import("@/lib/loyalty/processOrder.server");
          await processLoyaltyForOrder(orderData.order_id);
        } catch (loyaltyError) {
          // No fallar la orden si falla la lógica de puntos
          console.error("[save-order] Error al procesar puntos en orden nueva:", loyaltyError);
        }
      }

      // Crear items de la orden solo si la orden es nueva
      // IMPORTANTE: unit_price_cents es el precio UNITARIO en centavos
      const { variantDetailToJSON } = await import("@/lib/products/parseVariantDetail");
      const orderItems = orderData.items.map((item) => {
        // Convertir variant_detail de string a JSON
        const variantDetailJSON = variantDetailToJSON(item.variant_detail || null);
        return {
          order_id: orderData.order_id,
          product_id: item.productId || null,
          title: item.title,
          unit_price_cents: item.unitPriceCents, // INT en centavos - precio UNITARIO
          qty: item.qty,
          image_url: item.image_url || null,
          variant_detail: variantDetailJSON,
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("[save-order] Error al crear items:", {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
          order_id: orderData.order_id,
          items_count: orderItems.length,
        });
        return NextResponse.json(
          { error: "No se pudo guardar la orden" },
          { status: 500 },
        );
      }
    }

    if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
      console.info("[save-order] Orden guardada exitosamente:", {
        order_id: orderData.order_id,
        email: orderData.email,
        total_cents: orderData.total_cents,
        status: orderData.status,
        items_count: orderData.items.length,
      });
    }

    return NextResponse.json({
      success: true,
      order_id: orderData.order_id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[save-order]", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}

