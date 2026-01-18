import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createActionSupabase } from "@/lib/supabase/server-actions";
import { z } from "zod";
import { toMxE164, toMxWhatsAppDigits, isValidMx10 } from "@/lib/phone/mx";
import { estimatePackageWeight } from "@/lib/shipping/estimatePackageWeight";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Schema Zod para validación
// FLUJO: create-order CREA la orden + items (status 'pending')
//        save-order SOLO ACTUALIZA la orden existente (status, metadata), NO inserta nuevos items
const OrderItemSchema = z.object({
  id: z.string().min(1),
  qty: z.number().int().positive(),
  price_cents: z.number().int().nonnegative(),
  title: z.string().min(1).optional(), // Título del producto (se usa si está disponible)
  image_url: z.string().url().optional().nullable(), // URL de imagen del producto
  variant_detail: z.string().optional().nullable(), // Detalle de variantes (color, medidas, etc.)
});

const CreateOrderRequestSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  phone: z.string().optional(), // Teléfono del cliente
  whatsappConfirmed: z.boolean().optional().default(false), // Confirmación de WhatsApp
  shippingAddressConfirmed: z.boolean().optional().default(false), // Confirmación de dirección
  // Aceptar los valores reales del frontend: pickup, standard, express
  // Mapear standard/express a "delivery" internamente para metadata
  shippingMethod: z.enum(["pickup", "standard", "express"]).optional(),
  shippingCostCents: z.number().int().nonnegative().optional(), // Costo de envío en centavos
  discountCents: z.number().int().nonnegative().optional(), // Descuento en centavos (cupón)
  discountScope: z.enum(["subtotal", "shipping"]).optional(),
  couponCode: z.string().optional().nullable(),
  // Método y estado de pago
  paymentMethod: z.enum(["card", "bank_transfer"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "canceled"]).optional(),
  // Dirección de envío (opcional, solo si no es pickup)
  shippingAddress: z.object({
    name: z.string(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    address1: z.string(),
    address2: z.string().nullable().optional(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string().default("MX"),
  }).optional(),
  // Información de Skydropx opcional
  shipping: z.object({
    provider: z.string(),
    option_code: z.string(),
    price_cents: z.number().int().nonnegative(),
    pricing: z
      .object({
        carrier_cents: z.number().int().nonnegative(),
        packaging_cents: z.number().int().nonnegative(),
        margin_cents: z.number().int().nonnegative().optional(),
        total_cents: z.number().int().nonnegative(),
      })
      .optional(),
    package_used: z
      .object({
        weight_g: z.number().int().positive(),
        length_cm: z.number().int().positive(),
        width_cm: z.number().int().positive(),
        height_cm: z.number().int().positive(),
        source: z.enum(["default", "calculated"]),
      })
      .optional(),
    rate: z.object({
      external_id: z.string(),
      provider: z.string(),
      service: z.string(),
      eta_min_days: z.number().int().nullable().optional(),
      eta_max_days: z.number().int().nullable().optional(),
    }),
    address_validation: z
      .object({
        verdict: z.enum(["valid", "needs_review", "invalid"]),
        normalized_address: z
          .object({
            name: z.string(),
            phone: z.string().nullable().optional(),
            email: z.string().nullable().optional(),
            address1: z.string(),
            address2: z.string().nullable().optional(),
            city: z.string(),
            state: z.string(),
            postal_code: z.string(),
            country: z.string().optional(),
          })
          .nullable()
          .optional(),
        missing_fields: z.array(z.string()).optional(),
      })
      .optional(),
  }).optional(),
  // Datos de loyalty opcionales
  loyalty: z.object({
    applied: z.boolean(),
    pointsToSpend: z.number().int().positive(),
    discountPercent: z.number().int().nonnegative(),
    discountCents: z.number().int().nonnegative(),
    balanceBefore: z.number().int().nonnegative(),
  }).optional(),
});

// Type export for potential future use
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

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
    const validationResult = CreateOrderRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      console.warn("[create-order] Validación fallida:", errors);
      return NextResponse.json(
        { error: `Datos inválidos: ${errors}` },
        { status: 422 },
      );
    }

    const orderData = validationResult.data;

    // Validar que items.length > 0 y todos los price_cents > 0 y qty > 0
    if (orderData.items.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío" },
        { status: 422 },
      );
    }

    const hasInvalidItem = orderData.items.some(
      (item) => item.price_cents <= 0 || item.qty <= 0,
    );

    if (hasInvalidItem) {
      return NextResponse.json(
        { error: "Todos los items deben tener precio y cantidad mayor a 0" },
        { status: 422 },
      );
    }

    // Calcular subtotal_cents
    const subtotal_cents = orderData.items.reduce(
      (sum, item) => sum + item.qty * item.price_cents,
      0,
    );

    // Log controlado para debugging
    if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
      console.info("[create-order] payload recibido:", {
        items_count: orderData.items.length,
        items: orderData.items.map((i) => ({
          id: i.id,
          qty: i.qty,
          price_cents: i.price_cents,
        })),
        subtotal_cents,
      });
    }

    if (!subtotal_cents || subtotal_cents <= 0) {
      console.warn("[create-order] Subtotal inválido:", {
        subtotal_cents,
        items: orderData.items.map((i) => ({
          id: i.id,
          qty: i.qty,
          price_cents: i.price_cents,
        })),
      });
      return NextResponse.json(
        { error: "Subtotal de la orden inválido" },
        { status: 422 },
      );
    }

    // Calcular total_cents coherente con checkout (incluye envío y descuentos)
    const shippingCostCents = orderData.shippingCostCents ?? 0;
    const discountCents = orderData.discountCents ?? 0;
    const discountScope = orderData.discountScope ?? null;
    const loyaltyDiscountCents =
      orderData.loyalty && typeof orderData.loyalty.discountCents === "number"
        ? Math.max(0, orderData.loyalty.discountCents)
        : 0;

    let total_cents = subtotal_cents + shippingCostCents;
    if (discountCents > 0 && discountScope) {
      if (discountScope === "subtotal") {
        total_cents = subtotal_cents - discountCents + shippingCostCents;
      } else if (discountScope === "shipping") {
        total_cents =
          subtotal_cents + Math.max(0, shippingCostCents - discountCents);
      }
    }
    if (loyaltyDiscountCents > 0) {
      total_cents = Math.max(0, total_cents - loyaltyDiscountCents);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Si Supabase no está configurado, generar un order_id temporal para que Stripe funcione
    if (!supabaseUrl || !serviceRoleKey) {
      const crypto = await import("crypto");
      const tempOrderId = crypto.randomUUID();
      
      console.info("[create-order] order", tempOrderId, total_cents);
      
      return NextResponse.json({
        order_id: tempOrderId,
        total_cents: total_cents,
        currency: "mxn",
      });
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
      // Si no hay sesión, continuar como guest
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // IDEMPOTENCIA SIMPLIFICADA: Solo reusar órdenes si están en estados específicos y NO están paid
    // NO reusar órdenes basándose en hash de items (cada compra debe generar un nuevo orderId)
    // Solo reusar si la misma orden se llama múltiples veces mientras está pendiente
    
    // Mapear shippingMethod del frontend a valor interno para metadata
    // Frontend usa: "pickup" | "standard" | "express"
    // Guardamos el valor original en metadata para referencia
    const shippingMethodForMetadata = orderData.shippingMethod || "pickup";
    
    // Construir metadata con información adicional
    const phone = orderData.phone || null;
    const whatsappConfirmed = orderData.whatsappConfirmed ?? false;
    const shippingAddressConfirmed = orderData.shippingAddressConfirmed ?? false;
    
    // Normalizar teléfono para WhatsApp si es válido
    const whatsappDigits10 = phone && isValidMx10(phone) ? phone : null;
    const whatsappE164 = whatsappDigits10 ? toMxE164(whatsappDigits10) : null;
    const whatsappWaDigits = whatsappDigits10 ? toMxWhatsAppDigits(whatsappDigits10) : null;
    
    const metadata: Record<string, unknown> = {
      subtotal_cents, // Subtotal real (sin envío ni descuentos)
      shipping_cost_cents: shippingCostCents, // Costo de envío en centavos
      discount_cents: discountCents,
      discount_scope: discountScope,
      coupon_code: orderData.couponCode ?? null,
      shipping_method: shippingMethodForMetadata, // Guardar valor original: pickup, standard, express
      contact_name: orderData.name || null,
      contact_email: orderData.email || null,
      contact_phone: phone || null,
      // Campos de WhatsApp normalizados
      whatsapp_raw: phone || null,
      whatsapp_digits10: whatsappDigits10,
      whatsapp_e164: whatsappE164,
      whatsapp_wa_digits: whatsappWaDigits,
      whatsapp_confirmed: whatsappConfirmed,
      // Confirmación de dirección
      shipping_address_confirmed: shippingAddressConfirmed,
    };

    // Guardar dirección de envío en metadata.shipping_address (solo si no es pickup)
    if (orderData.shippingAddress) {
      metadata.shipping_address = orderData.shippingAddress;
    }

    // Incluir información de Skydropx si está presente
    if (orderData.shipping) {
      const shippingMeta: Record<string, unknown> = { ...orderData.shipping };
      // Persistir address_validation dentro de metadata.shipping.address_validation
      if (orderData.shipping.address_validation) {
        shippingMeta.address_validation = orderData.shipping.address_validation;
      }
      metadata.shipping = shippingMeta;
      if (orderData.shipping.pricing) {
        metadata.shipping_pricing = orderData.shipping.pricing;
      }
      if (orderData.shipping.package_used) {
        const shippingMetaWithPackage = (metadata.shipping as Record<string, unknown>) || {};
        metadata.shipping = {
          ...shippingMetaWithPackage,
          package_used: orderData.shipping.package_used,
        };
      }
    }

    // Calcular paquete estimado desde productos (checkout) si aún no existe
    if (!metadata.shipping_package_estimated && orderData.items.length > 0) {
      const BASE_PACKAGE_WEIGHT_G = 1200; // caja + relleno + cinta
      const defaultLengthCm = 25;
      const defaultWidthCm = 20;
      const defaultHeightCm = 15;
      const productIds = orderData.items.map((item) => item.id).filter(Boolean);

      if (productIds.length > 0) {
        try {
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
              product_id: item.id || null,
              qty: item.qty,
            })),
            productsMap,
            defaultItemWeightG,
          );

          const MIN_BILLABLE_WEIGHT_G = parseInt(
            process.env.SKYDROPX_MIN_BILLABLE_WEIGHT_G || "1000",
            10,
          );
          const estimatedWithBase = estimated.weight_g + BASE_PACKAGE_WEIGHT_G;
          const finalWeightG = Math.max(estimatedWithBase, MIN_BILLABLE_WEIGHT_G);

          const estimatedPackage = {
            weight_g: finalWeightG,
            length_cm: defaultLengthCm,
            width_cm: defaultWidthCm,
            height_cm: defaultHeightCm,
            base_weight_g: BASE_PACKAGE_WEIGHT_G,
            source: estimated.source,
            fallback_used_count: estimated.fallback_used_count,
            was_clamped: finalWeightG > estimatedWithBase,
          };

          metadata.shipping_package_estimated = estimatedPackage;
          const currentShippingMeta = (metadata.shipping as Record<string, unknown>) || {};
          metadata.shipping = {
            ...currentShippingMeta,
            estimated_package: estimatedPackage,
          };
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[create-order] Error al calcular paquete estimado:", error);
          }
        }
      }
    }

    // Validar y procesar datos de loyalty si están presentes
    if (orderData.loyalty) {
      const loyaltyData = orderData.loyalty;
      
      // Validar que el usuario tenga puntos suficientes antes de aplicar descuento
      if (loyaltyData.applied && orderData.email) {
        try {
          const { getLoyaltySummaryByEmail } = await import("@/lib/loyalty/points.server");
          const { LOYALTY_MIN_POINTS_FOR_DISCOUNT } = await import("@/lib/loyalty/config");
          
          const loyaltySummary = await getLoyaltySummaryByEmail(orderData.email);
          
          // Si no tiene puntos suficientes, ignorar el descuento
          if (!loyaltySummary || loyaltySummary.pointsBalance < LOYALTY_MIN_POINTS_FOR_DISCOUNT) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[create-order] Intentando aplicar descuento sin puntos suficientes:", {
                email: orderData.email,
                pointsBalance: loyaltySummary?.pointsBalance || 0,
                required: LOYALTY_MIN_POINTS_FOR_DISCOUNT,
              });
            }
            // No incluir datos de loyalty en metadata si no tiene puntos suficientes
            // Continuar con el flujo normal sin romper la orden
          } else {
            // Validar que los puntos a gastar sean correctos
            if (loyaltyData.pointsToSpend !== LOYALTY_MIN_POINTS_FOR_DISCOUNT) {
              if (process.env.NODE_ENV === "development") {
                console.warn("[create-order] Cantidad de puntos incorrecta:", {
                  email: orderData.email,
                  received: loyaltyData.pointsToSpend,
                  expected: LOYALTY_MIN_POINTS_FOR_DISCOUNT,
                });
              }
              // Ajustar a la cantidad correcta
              loyaltyData.pointsToSpend = LOYALTY_MIN_POINTS_FOR_DISCOUNT;
            }
            
            metadata.loyalty = loyaltyData;
          }
        } catch (loyaltyError) {
          // Si hay error al validar, no aplicar descuento pero no romper la orden
          console.error("[create-order] Error al validar puntos de lealtad:", loyaltyError);
          // No incluir datos de loyalty en metadata
        }
      } else if (loyaltyData.applied && !orderData.email) {
        // Si intenta aplicar descuento sin email, ignorar
        if (process.env.NODE_ENV === "development") {
          console.warn("[create-order] Intentando aplicar descuento sin email");
        }
        // No incluir datos de loyalty en metadata
      } else {
        // Si no está aplicado, incluir los datos para referencia
        metadata.loyalty = loyaltyData;
      }
    }

    // Preparar datos de shipping: priorizar Skydropx si está disponible, sino usar método manual
    let shippingProvider: string | null = null;
    let shippingServiceName: string | null = null;
    let shippingRateExtId: string | null = null;
    let shippingEtaMinDays: number | null = null;
    let shippingEtaMaxDays: number | null = null;
    let shippingPriceCents: number | null = null;

    if (orderData.shipping) {
      // Caso Skydropx
      shippingProvider = orderData.shipping.provider || "skydropx";
      shippingServiceName = orderData.shipping.rate?.service || null;
      shippingRateExtId = orderData.shipping.rate?.external_id || null;
      shippingEtaMinDays = orderData.shipping.rate?.eta_min_days ?? null;
      shippingEtaMaxDays = orderData.shipping.rate?.eta_max_days ?? null;
      shippingPriceCents = orderData.shipping.price_cents || null;
    } else if (shippingMethodForMetadata === "pickup") {
      // Caso "Recoger en tienda"
      shippingProvider = "pickup";
      shippingServiceName = "Recoger en tienda";
      shippingPriceCents = 0;
      // shippingRateExtId, shippingEtaMinDays, shippingEtaMaxDays quedan null
    } else {
      // Caso método manual (standard/express) sin Skydropx
      shippingProvider = "manual";
      shippingServiceName = shippingMethodForMetadata === "standard" ? "Envío estándar" : "Envío express";
      shippingPriceCents = shippingCostCents;
      // shippingRateExtId, shippingEtaMinDays, shippingEtaMaxDays quedan null
    }

    // Determinar payment_method, payment_status, payment_provider y payment_id
    // Si viene en el payload, usarlo; si no, inferir según stripe_session_id
    const paymentMethod: string | null = orderData.paymentMethod || null;
    let paymentStatus: string | null = orderData.paymentStatus || null;
    let paymentProvider: string | null = null;
    const paymentId: string | null = null;
    
    // Si no viene paymentStatus, determinar según método:
    // - card: "pending" (se actualizará cuando Stripe confirme)
    // - bank_transfer: "pending"
    if (!paymentStatus && paymentMethod) {
      paymentStatus = "pending";
    }

    // Establecer payment_provider según payment_method
    if (paymentMethod === "card") {
      paymentProvider = "stripe"; // Se actualizará cuando se cree el PaymentIntent
    } else if (paymentMethod === "bank_transfer") {
      paymentProvider = "bank_transfer";
    }

    // Crear orden usando SOLO las columnas válidas del schema real
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user_id,
        email: orderData.email || null,
        total_cents: total_cents, // INT en centavos
        status: "pending",
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
        // Método y estado de pago
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        payment_provider: paymentProvider,
        payment_id: paymentId,
      })
      .select("id, total_cents")
      .single();

    if (orderError || !order) {
      console.error("[create-order] Error al crear orden:", {
        message: orderError?.message,
        details: orderError?.details,
        hint: orderError?.hint,
        code: orderError?.code,
        total_cents,
        items_count: orderData.items.length,
      });
      return NextResponse.json(
        { error: `Error al crear orden: ${orderError?.message || "Error desconocido"}` },
        { status: 500 },
      );
    }

    // IDEMPOTENCIA: Verificar si ya existen items para esta orden antes de insertar
    const { data: existingItems } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", order.id)
      .limit(1);

    // Solo insertar items si NO existen (idempotencia)
    if (!existingItems || existingItems.length === 0) {
      // Crear items de la orden usando SOLO las columnas válidas del schema real
      // IMPORTANTE: unit_price_cents es el precio UNITARIO en centavos (no el total del item)
      const { variantDetailToJSON } = await import("@/lib/products/parseVariantDetail");
      const orderItems = orderData.items.map((item) => {
        if (item.price_cents <= 0) {
          console.warn("[create-order] Item con precio inválido:", {
            id: item.id,
            price_cents: item.price_cents,
          });
        }
        // Convertir variant_detail de string a JSON
        const variantDetailJSON = variantDetailToJSON(item.variant_detail || null);
        return {
          order_id: order.id,
          product_id: item.id || null, // UUID si es válido, sino null
          title: item.title || `Producto ${item.id}`, // Usar título del payload si está disponible
          unit_price_cents: item.price_cents, // INT en centavos - precio UNITARIO del producto
          qty: item.qty, // Cantidad comprada
          image_url: item.image_url || null, // URL de imagen si está disponible
          variant_detail: variantDetailJSON, // JSON con detalles de variantes (color, notas, etc.)
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        // Limpiar orden si fallan los items
        await supabase.from("orders").delete().eq("id", order.id);
        console.error("[create-order] Error al crear items:", {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
          order_id: order.id,
          items_count: orderItems.length,
        });
        return NextResponse.json(
          { error: `Error al crear items: ${itemsError.message}` },
          { status: 500 },
        );
      }
    } else {
      if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
        console.info("[create-order] Items ya existen para esta orden, no se insertan duplicados");
      }
    }

    console.info("[create-order] order", order.id, total_cents);

    return NextResponse.json({
      order_id: order.id,
      total_cents,
      currency: "mxn",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    console.warn("[create-order]", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
