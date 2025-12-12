import "server-only";
import type { OrderSummary } from "@/lib/supabase/orders.server";

/**
 * Tipo para una entrada del historial de puntos
 */
export type LoyaltyHistoryEntry = {
  date: string; // ISO date string
  orderId: string;
  shortId: string;
  pointsEarned: number;
  pointsSpent: number;
  balanceAfter: number | null; // Balance después de esta transacción
};

/**
 * Tipo para el resultado del cálculo de historial
 */
export type LoyaltyHistoryResult = {
  currentPoints: number;
  lifetimeEarned: number;
  entries: LoyaltyHistoryEntry[];
};

/**
 * Calcula el historial de puntos a partir de una lista de órdenes
 * Solo incluye órdenes pagadas que tengan información de puntos en metadata
 * 
 * @param orders - Lista de órdenes del usuario
 * @returns Objeto con puntos actuales, lifetime y entradas del historial
 */
export function calculateLoyaltyHistory(
  orders: OrderSummary[],
): LoyaltyHistoryResult {
  // Filtrar solo órdenes pagadas
  const paidOrders = orders.filter((order) => order.status === "paid");

  // Extraer entradas del historial desde metadata
  const entries: LoyaltyHistoryEntry[] = [];

  for (const order of paidOrders) {
    const metadata = order.metadata || {};
    const pointsEarned =
      typeof metadata.loyalty_points_earned === "number"
        ? metadata.loyalty_points_earned
        : 0;
    const pointsSpent =
      typeof metadata.loyalty_points_spent === "number"
        ? metadata.loyalty_points_spent
        : 0;
    const balanceAfter =
      typeof metadata.loyalty_points_balance_after === "number"
        ? metadata.loyalty_points_balance_after
        : null;

    // Solo agregar entrada si hay puntos ganados o gastados
    if (pointsEarned > 0 || pointsSpent > 0) {
      entries.push({
        date: order.created_at,
        orderId: order.id,
        shortId: order.shortId,
        pointsEarned,
        pointsSpent,
        balanceAfter,
      });
    }
  }

  // Ordenar por fecha descendente (más recientes primero)
  entries.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  // Calcular puntos actuales y lifetime
  // Si hay entradas, usar el balanceAfter de la más reciente
  // Si no, calcular sumando ganados y restando gastados
  let currentPoints = 0;
  let lifetimeEarned = 0;

  if (entries.length > 0) {
    // Usar el balanceAfter de la entrada más reciente (primera en el array ordenado)
    const mostRecentEntry = entries[0];
    if (mostRecentEntry.balanceAfter !== null) {
      currentPoints = mostRecentEntry.balanceAfter;
    } else {
      // Fallback: calcular desde cero
      for (const entry of entries) {
        lifetimeEarned += entry.pointsEarned;
        currentPoints += entry.pointsEarned - entry.pointsSpent;
      }
    }

    // Calcular lifetime sumando todos los puntos ganados
    lifetimeEarned = entries.reduce((sum, entry) => sum + entry.pointsEarned, 0);
  }

  return {
    currentPoints,
    lifetimeEarned,
    entries,
  };
}

