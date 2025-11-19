import "server-only";
import { createClient } from "@supabase/supabase-js";
import { addLoyaltyPoints, spendLoyaltyPoints } from "./points.server";
import { LOYALTY_POINTS_PER_MXN } from "./config";

/**
 * Tipo para representar una orden desde Supabase
 */
type OrderRow = {
  id: string;
  email: string | null;
  total_cents: number | null;
  status: string;
  metadata: Record<string, unknown> | null;
};

/**
 * Crea un cliente Supabase con SERVICE_ROLE_KEY
 */
function createServiceRoleSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables de Supabase (URL o SERVICE_ROLE_KEY)");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Extrae el email de una orden, normalizándolo
 * Prioridad: order.email > metadata.contact_email
 */
function extractOrderEmail(order: OrderRow): string | null {
  // Prioridad 1: columna email
  if (order.email && typeof order.email === "string" && order.email.trim()) {
    return order.email.trim().toLowerCase();
  }

  // Prioridad 2: metadata.contact_email
  if (order.metadata && typeof order.metadata === "object") {
    const metadata = order.metadata as Record<string, unknown>;
    const contactEmail = metadata.contact_email;
    if (contactEmail && typeof contactEmail === "string" && contactEmail.trim()) {
      return contactEmail.trim().toLowerCase();
    }
  }

  return null;
}

/**
 * Procesa puntos de lealtad para una orden pagada
 * 
 * Esta función es idempotente: solo procesa puntos si:
 * - La orden tiene status "paid"
 * - La orden tiene email válido
 * - La orden tiene total_cents > 0
 * - Los puntos NO se han procesado ya (verifica metadata.loyalty_points_earned)
 * 
 * @param orderId - ID de la orden
 * @returns Objeto con información del procesamiento, o null si no se procesó
 */
export async function processLoyaltyForOrder(
  orderId: string,
): Promise<{
  processed: boolean;
  email: string | null;
  pointsEarned: number;
  pointsSpent: number;
  error?: string;
} | null> {
  const supabase = createServiceRoleSupabase();

  // Obtener la orden completa
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, email, total_cents, status, metadata")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    if (process.env.NODE_ENV === "development") {
      console.error("[processLoyaltyForOrder] Error al obtener orden:", {
        orderId,
        error: fetchError?.message,
      });
    }
    return null;
  }

  // Verificar que la orden esté pagada
  if (order.status !== "paid") {
    if (process.env.NODE_ENV === "development") {
      console.log("[processLoyaltyForOrder] Orden no está pagada, saltando:", {
        orderId,
        status: order.status,
      });
    }
    return null;
  }

  // Extraer email normalizado
  const email = extractOrderEmail(order as OrderRow);
  if (!email) {
    if (process.env.NODE_ENV === "development") {
      console.log("[processLoyaltyForOrder] Orden sin email válido, saltando:", {
        orderId,
        orderEmail: order.email,
        metadata: order.metadata,
      });
    }
    return null;
  }

  // Verificar que tenga total_cents válido
  const totalCents = order.total_cents;
  if (!totalCents || totalCents <= 0) {
    if (process.env.NODE_ENV === "development") {
      console.log("[processLoyaltyForOrder] Orden sin total válido, saltando:", {
        orderId,
        totalCents,
      });
    }
    return null;
  }

  // Verificar idempotencia: si ya se procesaron puntos, no procesar de nuevo
  const metadata = (order.metadata as Record<string, unknown>) || {};
  const loyaltyPointsEarned = metadata.loyalty_points_earned;
  if (loyaltyPointsEarned && typeof loyaltyPointsEarned === "number" && loyaltyPointsEarned > 0) {
    if (process.env.NODE_ENV === "development") {
      console.log("[processLoyaltyForOrder] Puntos ya procesados, saltando (idempotencia):", {
        orderId,
        email,
        loyaltyPointsEarned,
      });
    }
    return {
      processed: false,
      email,
      pointsEarned: loyaltyPointsEarned as number,
      pointsSpent: (metadata.loyalty_points_spent as number) || 0,
    };
  }

  try {
    // Procesar descuento de puntos si se aplicó
    let pointsSpent = 0;
    const loyaltyData = metadata.loyalty as
      | {
          applied?: boolean;
          pointsToSpend?: number;
          discountPercent?: number;
          discountCents?: number;
          balanceBefore?: number;
        }
      | undefined;

    if (loyaltyData?.applied && loyaltyData.pointsToSpend && loyaltyData.pointsToSpend > 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("[processLoyaltyForOrder] Gastando puntos de descuento:", {
          orderId,
          email,
          pointsToSpend: loyaltyData.pointsToSpend,
        });
      }

      try {
        await spendLoyaltyPoints(email, loyaltyData.pointsToSpend);
        pointsSpent = loyaltyData.pointsToSpend;
      } catch (spendError) {
        // Si falla al gastar puntos, loguear pero continuar (no fallar la orden)
        console.error("[processLoyaltyForOrder] Error al gastar puntos:", spendError);
        if (process.env.NODE_ENV === "development") {
          console.error("[processLoyaltyForOrder] Error details:", {
            orderId,
            email,
            error: spendError instanceof Error ? spendError.message : String(spendError),
          });
        }
      }
    }

    // Calcular y añadir puntos ganados
    const mxnTotal = Math.max(0, Math.floor(totalCents / 100));
    const pointsEarned = mxnTotal * LOYALTY_POINTS_PER_MXN;

    if (pointsEarned <= 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("[processLoyaltyForOrder] No hay puntos para añadir (mxnTotal = 0):", {
          orderId,
          email,
          totalCents,
          mxnTotal,
        });
      }
      return {
        processed: false,
        email,
        pointsEarned: 0,
        pointsSpent,
      };
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[processLoyaltyForOrder] Añadiendo puntos:", {
        orderId,
        email,
        totalCents,
        mxnTotal,
        pointsEarned,
        pointsSpent,
      });
    }

    const loyaltySummary = await addLoyaltyPoints(email, pointsEarned);

    if (process.env.NODE_ENV === "development") {
      console.log("[processLoyaltyForOrder] Puntos añadidos exitosamente:", {
        orderId,
        email,
        pointsEarned,
        pointsSpent,
        newBalance: loyaltySummary.pointsBalance,
      });
    }

    // Actualizar metadata de la orden con información de puntos
    await supabase
      .from("orders")
      .update({
        metadata: {
          ...metadata,
          loyalty_points_earned: pointsEarned,
          loyalty_points_spent: pointsSpent,
          loyalty_discount_cents: loyaltyData?.discountCents || 0,
          loyalty_points_balance_after: loyaltySummary.pointsBalance,
          loyalty: loyaltyData
            ? {
                ...loyaltyData,
                balanceBefore: loyaltySummary.pointsBalance + pointsSpent,
                balanceAfter: loyaltySummary.pointsBalance,
              }
            : undefined,
        },
      })
      .eq("id", orderId);

    return {
      processed: true,
      email,
      pointsEarned,
      pointsSpent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[processLoyaltyForOrder] Error al procesar puntos:", {
      orderId,
      email,
      error: errorMessage,
    });

    return {
      processed: false,
      email,
      pointsEarned: 0,
      pointsSpent: 0,
      error: errorMessage,
    };
  }
}

