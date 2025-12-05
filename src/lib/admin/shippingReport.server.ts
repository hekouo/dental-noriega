/**
 * Helper server-side para reportes de envío
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";

export type ShippingReportRow = {
  provider: string;
  serviceName: string | null;
  ordersCount: number;
  totalShippingPriceCents: number;
};

/**
 * Obtiene un reporte de envíos agrupado por proveedor y servicio
 * @param params - Rango de fechas para filtrar
 */
export async function getShippingReport(params: {
  from: Date;
  to: Date;
}): Promise<ShippingReportRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[getShippingReport] Configuración de Supabase incompleta");
    return [];
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Obtener órdenes con shipping_provider no null en el rango de fechas
  const { data: orders, error } = await supabase
    .from("orders")
    .select("shipping_provider, shipping_service_name, shipping_price_cents")
    .not("shipping_provider", "is", null)
    .gte("created_at", params.from.toISOString())
    .lt("created_at", params.to.toISOString());

  if (error) {
    console.error("[getShippingReport] Error al consultar:", error);
    return [];
  }

  if (!orders || orders.length === 0) {
    return [];
  }

  // Agrupar en memoria por provider y serviceName
  const grouped = new Map<string, ShippingReportRow>();

  for (const order of orders) {
    const provider = order.shipping_provider || "unknown";
    const serviceName = order.shipping_service_name || null;
    const key = `${provider}::${serviceName || "null"}`;

    const existing = grouped.get(key);
    if (existing) {
      existing.ordersCount += 1;
      existing.totalShippingPriceCents += order.shipping_price_cents || 0;
    } else {
      grouped.set(key, {
        provider,
        serviceName,
        ordersCount: 1,
        totalShippingPriceCents: order.shipping_price_cents || 0,
      });
    }
  }

  // Convertir a array y ordenar por provider, luego por serviceName
  return Array.from(grouped.values()).sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    const aService = a.serviceName || "";
    const bService = b.serviceName || "";
    return aService.localeCompare(bService);
  });
}

