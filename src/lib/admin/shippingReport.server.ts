import "server-only";
import { createClient } from "@supabase/supabase-js";

function createServiceRoleSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase configuration missing");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type ShippingReportRow = {
  provider: string;
  serviceName: string | null;
  ordersCount: number;
  totalShippingPriceCents: number;
};

/**
 * Genera un reporte de envíos agrupado por proveedor y servicio
 * @param params - Parámetros de filtro por rango de fechas
 * @returns Array de filas del reporte
 */
export async function getShippingReport(params: {
  from: Date;
  to: Date;
}): Promise<ShippingReportRow[]> {
  const supabase = createServiceRoleSupabase();

  try {
    // Consultar órdenes con shipping_provider no nulo en el rango de fechas
    const { data: orders, error } = await supabase
      .from("orders")
      .select("shipping_provider, shipping_service_name, shipping_price_cents")
      .not("shipping_provider", "is", null)
      .gte("created_at", params.from.toISOString())
      .lt("created_at", params.to.toISOString());

    if (error) {
      console.error("[getShippingReport] Error al consultar órdenes:", error);
      return [];
    }

    if (!orders || orders.length === 0) {
      return [];
    }

    // Agrupar en memoria por provider y service_name
    const grouped = new Map<string, ShippingReportRow>();

    for (const order of orders) {
      const provider = order.shipping_provider || "unknown";
      const serviceName = order.shipping_service_name || null;
      
      // Clave única: provider + serviceName (o "null" si es null)
      const key = `${provider}::${serviceName || "null"}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          provider,
          serviceName,
          ordersCount: 0,
          totalShippingPriceCents: 0,
        });
      }

      const row = grouped.get(key)!;
      row.ordersCount += 1;
      
      // Sumar shipping_price_cents (tratar null como 0)
      const priceCents = order.shipping_price_cents || 0;
      row.totalShippingPriceCents += priceCents;
    }

    // Convertir Map a Array y ordenar por provider, luego por serviceName
    const result = Array.from(grouped.values()).sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      const aService = a.serviceName || "";
      const bService = b.serviceName || "";
      return aService.localeCompare(bService);
    });

    return result;
  } catch (err) {
    console.error("[getShippingReport] Error inesperado:", err);
    return [];
  }
}
