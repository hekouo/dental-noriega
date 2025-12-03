import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createActionSupabase } from "@/lib/supabase/server-actions";

type OrderItem = {
  product_id?: string;
  slug?: string;
  title?: string;
  price_cents: number;
  qty: number;
};

type ShippingMethod = "pickup" | "standard" | "express";

type OrderRequest = {
  items: OrderItem[];
  shipping: {
    method: ShippingMethod;
    cost_cents: number;
    // Información de Skydropx (opcional)
    provider?: string;
    service_name?: string;
    rate_ext_id?: string;
    eta_min_days?: number | null;
    eta_max_days?: number | null;
  };
  datos: {
    nombre: string;
    telefono: string;
    direccion: string;
    colonia: string;
    estado: string;
    cp: string;
    notas?: string;
  };
  coupon?: {
    code: string;
    discount_cents: number;
    scope: "subtotal" | "shipping";
  };
  totals: {
    subtotal_cents: number;
    shipping_cents: number;
    total_cents: number;
  };
};

function validateOrderRequest(body: unknown): OrderRequest | null {
  if (!body || typeof body !== "object") return null;

  const req = body as Partial<OrderRequest>;

  // Validar items
  if (!Array.isArray(req.items) || req.items.length === 0) return null;
  for (const item of req.items) {
    if (
      typeof item.price_cents !== "number" ||
      typeof item.qty !== "number" ||
      item.qty < 1
    ) {
      return null;
    }
  }

  // Validar shipping
  if (
    !req.shipping ||
    !["pickup", "standard", "express"].includes(req.shipping.method) ||
    typeof req.shipping.cost_cents !== "number"
  ) {
    return null;
  }

  // Validar datos
  if (
    !req.datos ||
    typeof req.datos.nombre !== "string" ||
    typeof req.datos.telefono !== "string" ||
    typeof req.datos.direccion !== "string" ||
    typeof req.datos.colonia !== "string" ||
    typeof req.datos.estado !== "string" ||
    typeof req.datos.cp !== "string"
  ) {
    return null;
  }

  // Validar totals
  if (
    !req.totals ||
    typeof req.totals.subtotal_cents !== "number" ||
    typeof req.totals.shipping_cents !== "number" ||
    typeof req.totals.total_cents !== "number"
  ) {
    return null;
  }

  return req as OrderRequest;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const orderData = validateOrderRequest(body);

    if (!orderData) {
      return NextResponse.json(
        { error: "Datos de orden inválidos" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Si hay envs de Supabase, insertar en DB
    if (supabaseUrl && serviceRoleKey) {
      try {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        // Intentar obtener user_id de la sesión (si el usuario está autenticado)
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

        const { generateOrderRef } = await import("@/lib/orders/ref");
        const orderRef = generateOrderRef();

        // Insertar orden (adaptado al schema existente)
        // Mapear shipping.method a fulfillment_method
        const fulfillmentMethod =
          orderData.shipping.method === "pickup" ? "pickup" : "delivery";

        // Construir dirección completa para pickup_location o notas
        const addressFull = `${orderData.datos.direccion}, ${orderData.datos.colonia}, ${orderData.datos.estado} ${orderData.datos.cp}`;
        const pickupLocation =
          orderData.shipping.method === "pickup"
            ? "Tienda física"
            : addressFull;

        // Preparar datos de shipping de Skydropx si están disponibles
        const shippingProvider = orderData.shipping.provider || null;
        const shippingServiceName = orderData.shipping.service_name || null;
        const shippingRateExtId = orderData.shipping.rate_ext_id || null;
        const shippingEtaMinDays = orderData.shipping.eta_min_days ?? null;
        const shippingEtaMaxDays = orderData.shipping.eta_max_days ?? null;
        const shippingPriceCents = orderData.shipping.provider
          ? orderData.totals.shipping_cents
          : null;

        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: user_id, // Ligar orden a usuario si está autenticado
            fulfillment_method: fulfillmentMethod,
            pickup_location: pickupLocation,
            contact_name: orderData.datos.nombre,
            contact_phone: orderData.datos.telefono,
            contact_email: null, // No disponible en datos
            subtotal: orderData.totals.subtotal_cents / 100,
            shipping_cost: orderData.totals.shipping_cents / 100,
            discount_amount: (orderData.coupon?.discount_cents || 0) / 100,
            total: orderData.totals.total_cents / 100,
            status: "pending",
            // Campos de shipping de Skydropx (opcionales)
            shipping_provider: shippingProvider,
            shipping_service_name: shippingServiceName,
            shipping_price_cents: shippingPriceCents,
            shipping_rate_ext_id: shippingRateExtId,
            shipping_eta_min_days: shippingEtaMinDays,
            shipping_eta_max_days: shippingEtaMaxDays,
          })
          .select("id")
          .single();

        if (orderError || !order) {
          console.error("[POST /api/orders] Error insertando orden:", orderError);
          // Fallback a mock si falla la inserción
          const { generateOrderRef: genRef } = await import("@/lib/orders/ref");
          return NextResponse.json({
            order_id: null,
            order_ref: genRef(),
          });
        }

        // Insertar items (adaptado al schema: sku, name, price, qty)
        // Usar índice para evitar duplicados en sku
        const orderItems = orderData.items.map((item, idx) => ({
          order_id: order.id,
          sku: item.product_id || item.slug || `item-${order.id}-${idx}`,
          name: item.title || "Producto",
          price: item.price_cents / 100,
          qty: item.qty,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          console.error(
            "[POST /api/orders] Error insertando items:",
            itemsError,
          );
          // Orden ya creada, pero items fallaron - devolver igual
        }

        return NextResponse.json({
          order_id: order.id,
          order_ref: orderRef,
        });
      } catch (supabaseError) {
        console.error("[POST /api/orders] Error con Supabase:", supabaseError);
        // Fallback a mock si hay error de conexión
        const { generateOrderRef } = await import("@/lib/orders/ref");
        return NextResponse.json({
          order_id: null,
          order_ref: generateOrderRef(),
        });
      }
    }

    // Fallback mock si no hay envs
    const { generateOrderRef } = await import("@/lib/orders/ref");
    return NextResponse.json({
      order_id: null,
      order_ref: generateOrderRef(),
    });
  } catch (error) {
    console.error("[POST /api/orders] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
