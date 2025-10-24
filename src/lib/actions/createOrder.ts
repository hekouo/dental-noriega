"use server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

type OrderItem = {
  id: string;
  title: string;
  price: number;
  qty: number;
};

type CreateOrderData = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  paymentMethod: string;
  items: OrderItem[];
};

export async function createOrderAction(data: CreateOrderData) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Calcular total
    const subtotal = data.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const total = subtotal; // Por ahora sin impuestos ni envío

    // Crear orden
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          customer_name: data.name,
          customer_email: data.email,
          customer_phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          country: data.country || null,
          payment_method: data.paymentMethod,
          subtotal,
          total,
          status: "pending"
        },
      ])
      .select()
      .single();

    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`);
    }

    // Crear items de la orden
    const orderItems = data.items.map((item) => ({
      order_id: order.id,
      sku: item.id,
      name: item.title,
      qty: item.qty,
      price: item.price,
      subtotal: item.price * item.qty,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      // Si falla la inserción de items, intentar limpiar la orden
      await supabase.from("orders").delete().eq("id", order.id);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    // Revalidar páginas relacionadas
    revalidatePath("/checkout");
    revalidatePath("/checkout/gracias");

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("[createOrderAction] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
