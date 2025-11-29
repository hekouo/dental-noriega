"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrderWithItemsAdmin } from "@/lib/supabase/orders.server";
import { createSkydropxShipment } from "@/lib/shipping/skydropx.server";
import { createClient } from "@supabase/supabase-js";

/**
 * Crea una guía de envío en Skydropx para una orden
 */
export async function createSkydropxLabelAction(
  orderId: string,
  _formData: FormData,
): Promise<void> {
  // Obtener orden
  const order = await getOrderWithItemsAdmin(orderId);

  if (!order) {
    redirect(`/admin/pedidos/${orderId}?error=orden_no_encontrada`);
    return;
  }

  // Extraer datos de dirección desde metadata
  const metadata = (order.metadata || {}) as Record<string, unknown>;
  const shipping = metadata.shipping as
    | {
        provider?: string;
        option_code?: string;
        price_cents?: number;
        rate?: {
          external_id?: string;
          provider?: string;
          service?: string;
          eta_min_days?: number | null;
          eta_max_days?: number | null;
        };
      }
    | undefined;

  const contactName =
    (metadata.contact_name as string) ||
    order.shipping?.contact_name ||
    "";
  const contactPhone =
    (metadata.contact_phone as string) ||
    order.shipping?.contact_phone ||
    "";
  const contactAddress =
    (metadata.contact_address as string) ||
    order.shipping?.contact_address ||
    "";
  const contactCity =
    (metadata.contact_city as string) || order.shipping?.contact_city || "";
  const contactState =
    (metadata.contact_state as string) || order.shipping?.contact_state || "";
  const contactCp =
    (metadata.contact_cp as string) || "";

  // Validar que tengamos datos mínimos
  if (!contactCp || !contactState || !contactCity) {
    redirect(
      `/admin/pedidos/${orderId}?error=direccion_incompleta`,
    );
    return;
  }

  // Obtener rate_id desde shipping.rate o recalcular
  const rateId: string | undefined = shipping?.rate?.external_id;

  // Si no hay rate_id guardado, intentar recalcular (fallback documentado)
  if (!rateId) {
    // Por ahora, requerir que exista rate_id en metadata
    // En el futuro se podría recalcular llamando a getSkydropxRates
    redirect(
      `/admin/pedidos/${orderId}?error=rate_id_no_encontrado`,
    );
    return;
  }

  // Calcular peso aproximado del carrito (1kg por producto como default)
  const totalWeightGrams = order.items.reduce((sum, item) => {
    return sum + (item.qty || 1) * 1000;
  }, 0);

  // Crear envío en Skydropx
  const result = await createSkydropxShipment({
    rateId,
    destination: {
      postalCode: contactCp,
      state: contactState,
      city: contactCity,
      country: "MX",
      name: contactName,
      phone: contactPhone || undefined,
      email: order.email || undefined,
      addressLine1: contactAddress || undefined,
    },
    pkg: {
      weightGrams: totalWeightGrams || 1000,
      // Dimensiones por defecto: 20x20x10 cm
      lengthCm: 20,
      widthCm: 20,
      heightCm: 10,
    },
  });

  if (!result.success) {
    redirect(
      `/admin/pedidos/${orderId}?error=skydropx_label_failed`,
    );
    return;
  }

  // Actualizar orden en Supabase con información del envío
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    redirect(
      `/admin/pedidos/${orderId}?error=configuracion_supabase`,
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Actualizar metadata.shipping con información del shipment
  const updatedShipping = {
    ...shipping,
    provider: "skydropx",
    shipment: {
      id: result.shipmentId,
      tracking_number: result.trackingNumber || "",
      label_url: result.labelUrl || "",
    },
  };

  const updatedMetadata = {
    ...metadata,
    shipping: updatedShipping,
  };

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("[createSkydropxLabelAction] Error al actualizar orden:", updateError);
    redirect(
      `/admin/pedidos/${orderId}?error=error_actualizar_orden`,
    );
    return;
  }

  // Revalidar rutas
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);

  redirect(`/admin/pedidos/${orderId}?success=skydropx_label_created`);
}

