"use client";

import Link from "next/link";
import {
  LOYALTY_POINTS_PER_MXN,
  LOYALTY_MIN_POINTS_FOR_DISCOUNT,
  getTierForPoints,
  getNextTierInfo,
  hasEnoughPointsForDiscount,
} from "@/lib/loyalty/config";

type Props = {
  pointsBalance: number;
  lifetimeEarned: number;
  loading?: boolean;
  error?: string | null;
  showLinkToDetail?: boolean;
};

/**
 * Componente reutilizable para mostrar el resumen de puntos de lealtad
 */
export default function LoyaltySummaryCard({
  pointsBalance,
  lifetimeEarned,
  loading = false,
  error = null,
  showLinkToDetail = false,
}: Props) {
  const pointsCurrent = pointsBalance ?? 0;
  const tier = getTierForPoints(pointsCurrent);
  const { nextTier, pointsToNext } = getNextTierInfo(pointsCurrent);
  const canUseDiscount = hasEnoughPointsForDiscount(pointsCurrent);

  // Mapear colores del tier a clases Tailwind
  const tierColorClasses: Record<string, { bg: string; text: string }> = {
    slate: { bg: "bg-slate-100", text: "text-slate-800" },
    blue: { bg: "bg-sky-100", text: "text-sky-800" },
    amber: { bg: "bg-amber-100", text: "text-amber-800" },
    purple: { bg: "bg-violet-100", text: "text-violet-800" },
  };
  const tierColor = tierColorClasses[tier.color] || tierColorClasses.slate;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900">
          Tus puntos
        </h2>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${tierColor.bg} ${tierColor.text}`}
        >
          {tier.name}
        </span>
      </div>
      {loading ? (
        <p className="text-gray-600">Cargando puntos...</p>
      ) : error ? (
        <p className="text-yellow-700 text-sm">{error}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Puntos disponibles:</span>
            <span className="text-2xl font-bold text-primary-600">
              {pointsCurrent.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Puntos acumulados:</span>
            <span className="text-lg font-semibold text-gray-900">
              {lifetimeEarned.toLocaleString()} puntos en total
            </span>
          </div>

          {/* Progreso hacia siguiente nivel */}
          {nextTier ? (
            <div className="pt-3 border-t border-blue-200 space-y-2">
              <p className="text-sm text-gray-600">
                Te faltan <strong>{pointsToNext?.toLocaleString()}</strong> puntos para llegar a{" "}
                <strong>{nextTier.name}</strong>.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        ((pointsCurrent - tier.minPoints) / (nextTier.minPoints - tier.minPoints)) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-blue-200">
              <p className="text-sm text-gray-600 font-medium">
                Has alcanzado el nivel máximo de lealtad.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-blue-200">
            <p className="text-sm text-gray-600">
              Ganas {LOYALTY_POINTS_PER_MXN} punto por cada ${LOYALTY_POINTS_PER_MXN} MXN que pagas en
              tus pedidos.
            </p>
            {canUseDiscount ? (
              <p className="text-sm font-medium text-green-700 mt-2">
                Puedes aplicar un 5% de descuento en tu siguiente compra.
              </p>
            ) : (
              <p className="text-sm text-gray-600 mt-2">
                Con {LOYALTY_MIN_POINTS_FOR_DISCOUNT.toLocaleString()} puntos puedes
                aplicar un 5% de descuento en un pedido.
              </p>
            )}
          </div>

          {/* Link a página de detalle */}
          {showLinkToDetail && (
            <div className="pt-3 border-t border-blue-200">
              <Link
                href="/cuenta/puntos"
                className="text-sm text-primary-600 hover:text-primary-700 underline underline-offset-2 font-medium"
              >
                Ver historial completo y logros →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
