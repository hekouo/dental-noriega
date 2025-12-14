import "server-only";
import { getLoyaltySummaryByEmail } from "./points.server";
import { getTierForPoints } from "./config";

/**
 * Resumen de lealtad para mostrar en el header
 */
export type LoyaltyHeaderSummary = {
  currentPoints: number;
  totalPoints: number;
  tierId: string;
  tierName: string;
};

/**
 * Obtiene el resumen de lealtad para un usuario por email
 * Incluye puntos actuales, totales y tier/nivel
 * @param email Email del usuario
 * @returns Resumen de lealtad o null si no se puede obtener
 */
export async function getLoyaltySummaryForUser(
  email: string,
): Promise<LoyaltyHeaderSummary | null> {
  try {
    const summary = await getLoyaltySummaryByEmail(email);

    if (!summary) {
      return null;
    }

    // Si no tiene puntos, devolver null (no mostrar badge)
    if (summary.pointsBalance <= 0) {
      return null;
    }

    // Obtener tier basado en puntos actuales
    const tier = getTierForPoints(summary.pointsBalance);

    return {
      currentPoints: summary.pointsBalance,
      totalPoints: summary.lifetimeEarned,
      tierId: tier.id,
      tierName: tier.name,
    };
  } catch (error) {
    // En caso de error, no lanzar excepción, solo retornar null
    if (process.env.NODE_ENV === "development") {
      console.error("[getLoyaltySummaryForUser] Error:", error);
    }
    return null;
  }
}

