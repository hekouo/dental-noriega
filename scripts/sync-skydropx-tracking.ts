/**
 * Script de polling para sincronizar estados de envío desde Skydropx
 * 
 * Este script busca órdenes con shipping_provider='skydropx' y estados
 * 'label_created' o 'in_transit', consulta el tracking en Skydropx API,
 * y actualiza el shipping_status en la base de datos.
 * 
 * USO:
 * - Vercel Cron: Agregar a vercel.json con schedule
 * - GitHub Actions: Crear workflow que ejecute este script
 * - Manual: `pnpm tsx scripts/sync-skydropx-tracking.ts`
 * 
 * REQUISITOS:
 * - Variables de entorno configuradas (SKYDROPX_CLIENT_ID, etc.)
 * - Acceso a Supabase con SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { skydropxFetch } from "@/lib/skydropx/client";
import { normalizeShippingStatus, isValidShippingStatus } from "@/lib/orders/statuses";

let supabase: any = null;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("❌ NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados");
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabase;
}

/**
 * Obtiene el estado de tracking desde Skydropx API
 */
async function getSkydropxTrackingStatus(
  trackingNumber: string,
): Promise<{ status: string | null; error: string | null }> {
  try {
    // Endpoint de tracking de Skydropx (ajustar según documentación)
    const response = await skydropxFetch(`/api/v1/trackings/${trackingNumber}`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        status: null,
        error: `Skydropx API error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json().catch(() => null);
    if (!data || typeof data !== "object") {
      return {
        status: null,
        error: "Invalid response from Skydropx API",
      };
    }

    // Extraer status del response (ajustar según estructura real de Skydropx)
    const status = data.status || data.shipping_status || data.state || null;
    return { status, error: null };
  } catch (error) {
    return {
      status: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Mapea el status de Skydropx a shipping_status canónico
 */
function mapSkydropxStatusToCanonical(skydropxStatus: string): string | null {
  const normalized = normalizeShippingStatus(skydropxStatus);
  if (normalized && isValidShippingStatus(normalized)) {
    return normalized;
  }

  // Mapeo manual si normalizeShippingStatus no funciona
  const statusLower = skydropxStatus.toLowerCase().trim();
  if (statusLower.includes("picked") || statusLower.includes("transit")) {
    return "in_transit";
  }
  if (statusLower.includes("delivered")) {
    return "delivered";
  }
  if (statusLower.includes("exception") || statusLower.includes("cancel")) {
    return "cancelled";
  }
  if (statusLower.includes("label") || statusLower.includes("created")) {
    return "label_created";
  }

  return null;
}

/**
 * Procesa una orden: consulta tracking y actualiza estado si cambió
 */
async function processOrder(
  order: {
    id: string;
    shipping_tracking_number: string | null;
    shipping_status: string | null;
  },
  client: any,
): Promise<{ updated: boolean; error: string | null }> {
  if (!order.shipping_tracking_number) {
    return { updated: false, error: "No tracking number" };
  }

  console.log(`[sync] Procesando orden ${order.id.slice(0, 8)}...`);

  // Consultar estado en Skydropx
  const { status: skydropxStatus, error } = await getSkydropxTrackingStatus(
    order.shipping_tracking_number,
  );

  if (error) {
    console.warn(`[sync] Error al consultar tracking para ${order.id.slice(0, 8)}:`, error);
    return { updated: false, error };
  }

  if (!skydropxStatus) {
    return { updated: false, error: "No status returned from Skydropx" };
  }

  // Mapear a estado canónico
  const canonicalStatus = mapSkydropxStatusToCanonical(skydropxStatus);
  if (!canonicalStatus) {
    console.warn(
      `[sync] No se pudo mapear status de Skydropx: ${skydropxStatus} para orden ${order.id.slice(0, 8)}`,
    );
    return { updated: false, error: `Cannot map status: ${skydropxStatus}` };
  }

  // Si el estado no cambió, no actualizar
  if (order.shipping_status === canonicalStatus) {
    console.log(`[sync] Estado ya está actualizado para ${order.id.slice(0, 8)}: ${canonicalStatus}`);
    return { updated: false, error: null };
  }

  // Actualizar en DB
  const { error: updateError } = await client
    .from("orders")
    .update({ shipping_status: canonicalStatus })
    .eq("id", order.id);

  if (updateError) {
    console.error(`[sync] Error al actualizar orden ${order.id.slice(0, 8)}:`, updateError);
    return { updated: false, error: updateError.message };
  }

  console.log(
    `[sync] ✅ Orden ${order.id.slice(0, 8)} actualizada: ${order.shipping_status} -> ${canonicalStatus}`,
  );
  return { updated: true, error: null };
}

/**
 * Función principal del script
 */
async function main() {
  const supabaseClient = getSupabaseClient();
  console.log("[sync] Iniciando sincronización de tracking Skydropx...");

  // Buscar órdenes de Skydropx con estados que pueden cambiar
  const { data: orders, error: fetchError } = await supabaseClient
    .from("orders")
    .select("id, shipping_tracking_number, shipping_status")
    .eq("shipping_provider", "skydropx")
    .in("shipping_status", ["label_created", "in_transit"])
    .not("shipping_tracking_number", "is", null)
    .limit(50); // Limitar para no sobrecargar

  if (fetchError) {
    console.error("[sync] Error al buscar órdenes:", fetchError);
    process.exit(1);
  }

  if (!orders || orders.length === 0) {
    console.log("[sync] 0 orders to sync");
    return;
  }

  console.log(`[sync] Encontradas ${orders.length} órdenes para sincronizar`);

  let updatedCount = 0;
  let errorCount = 0;

  // Procesar cada orden
  for (const order of orders) {
    const result = await processOrder(order, supabaseClient);
    if (result.updated) {
      updatedCount++;
    }
    if (result.error) {
      errorCount++;
    }
    // Pequeño delay para no sobrecargar la API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`[sync] ✅ Sincronización completada: ${updatedCount} actualizadas, ${errorCount} errores`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("[sync] Error fatal:", error);
      process.exit(1);
    });
}

// Exportar función para uso en endpoints
export async function syncSkydropxTracking() {
  return main();
}

