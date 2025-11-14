import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createActionSupabase } from "@/lib/supabase/server-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Schema Zod para validación
const OrderItemSchema = z.object({
  productId: z.string().uuid().optional(),
  title: z.string().min(1),
  qty: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  image_url: z.string().url().optional().nullable(),
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
});

type SaveOrderRequest = z.infer<typeof SaveOrderRequestSchema>;

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

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[save-order] Supabase no está configurado");
      return NextResponse.json(
        { error: "Servidor no configurado correctamente" },
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

    // El schema actual de orders usa total (decimal), no total_cents (INT)
    // Convertir total_cents a decimal para guardar en total
    const totalDecimal = orderData.total_cents / 100;
    
    // Calcular subtotal desde items
    const subtotalDecimal = orderData.items.reduce(
      (sum, item) => sum + (item.unitPriceCents * item.qty) / 100,
      0,
    );
    
    // Extraer shipping y discount de metadata si existen
    // shippingCost puede venir como número (centavos) o como decimal
    const shippingCostRaw = orderData.metadata?.shippingCost;
    const shippingCost = typeof shippingCostRaw === "number" 
      ? (shippingCostRaw > 100 ? shippingCostRaw / 100 : shippingCostRaw) // Si es > 100, asumir centavos
      : 0;
    
    // discount puede venir como número (centavos) o como decimal
    const discountRaw = orderData.metadata?.discount;
    const discountAmount = typeof discountRaw === "number"
      ? (discountRaw > 100 ? discountRaw / 100 : discountRaw) // Si es > 100, asumir centavos
      : 0;
    
    // Obtener fulfillment_method de metadata o usar default
    const fulfillmentMethod = (orderData.metadata?.shippingMethod as string) || "pickup";

    if (existingOrder) {
      // Actualizar orden existente usando el schema actual (total como decimal)
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          user_id: user_id,
          contact_email: orderData.email,
          contact_name: (orderData.metadata?.name as string) || null,
          contact_phone: (orderData.metadata?.phone as string) || null,
          subtotal: subtotalDecimal,
          total: totalDecimal,
          shipping_cost: shippingCost,
          discount_amount: discountAmount,
          status: orderData.status,
          stripe_session_id: orderData.payment_id || null,
        })
        .eq("id", orderData.order_id);

      if (updateError) {
        console.error("[save-order] Error al actualizar orden:", updateError);
        return NextResponse.json(
          { error: `Error al actualizar orden: ${updateError.message}` },
          { status: 500 },
        );
      }

      // Eliminar items existentes y crear nuevos
      await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderData.order_id);
    } else {
      // Crear nueva orden usando el schema actual
      const { error: insertError } = await supabase
        .from("orders")
        .insert({
          id: orderData.order_id,
          user_id: user_id,
          contact_email: orderData.email,
          contact_name: (orderData.metadata?.name as string) || null,
          contact_phone: (orderData.metadata?.phone as string) || null,
          subtotal: subtotalDecimal,
          total: totalDecimal,
          shipping_cost: shippingCost,
          discount_amount: discountAmount,
          status: orderData.status,
          fulfillment_method: fulfillmentMethod,
          stripe_session_id: orderData.payment_id || null,
        });

      if (insertError) {
        console.error("[save-order] Error al crear orden:", insertError);
        return NextResponse.json(
          { error: `Error al crear orden: ${insertError.message}` },
          { status: 500 },
        );
      }
    }

    // Crear items de la orden usando el schema actual (sku, name, price como decimal)
    const orderItems = orderData.items.map((item) => ({
      order_id: orderData.order_id,
      sku: item.productId || `item-${item.title}`,
      name: item.title,
      price: item.unitPriceCents / 100, // Convertir a decimal
      qty: item.qty,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("[save-order] Error al crear items:", itemsError);
      return NextResponse.json(
        { error: `Error al crear items: ${itemsError.message}` },
        { status: 500 },
      );
    }

    if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
      console.info("[save-order] Orden guardada exitosamente:", {
        order_id: orderData.order_id,
        email: orderData.email,
        total_cents: orderData.total_cents,
        status: orderData.status,
        items_count: orderItems.length,
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

