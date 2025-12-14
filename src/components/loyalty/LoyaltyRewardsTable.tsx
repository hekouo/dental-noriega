"use client";

import {
  LOYALTY_TIERS,
  getTierForPoints,
  type LoyaltyTier,
} from "@/lib/loyalty/config";

type Props = {
  currentPoints: number;
};

/**
 * Mapea el color del tier a clases Tailwind para el badge
 */
function getTierColorClasses(color: LoyaltyTier["color"]): {
  bg: string;
  text: string;
  border: string;
} {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    slate: {
      bg: "bg-slate-50",
      text: "text-slate-800",
      border: "border-slate-300",
    },
    blue: {
      bg: "bg-sky-50",
      text: "text-sky-800",
      border: "border-sky-300",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-300",
    },
    purple: {
      bg: "bg-violet-50",
      text: "text-violet-800",
      border: "border-violet-300",
    },
  };
  return colorMap[color] || colorMap.slate;
}

export default function LoyaltyRewardsTable({ currentPoints }: Props) {
  const currentTier = getTierForPoints(currentPoints);

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
          Niveles y recompensas
        </h2>
        <p className="text-sm text-gray-600">
          Los niveles se basan en los puntos que has acumulado en todas tus compras.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LOYALTY_TIERS.map((tier) => {
          const isCurrentTier = tier.id === currentTier.id;
          const colorClasses = getTierColorClasses(tier.color);

          return (
            <div
              key={tier.id}
              className={`rounded-lg border-2 p-4 ${
                isCurrentTier
                  ? "border-primary-500 bg-primary-50"
                  : `border-gray-200 ${colorClasses.bg}`
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">
                  {tier.name}
                </h3>
                {isCurrentTier && (
                  <span className="px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
                    Tu nivel actual
                  </span>
                )}
              </div>

              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">
                  {tier.maxPoints !== undefined
                    ? `De ${tier.minPoints.toLocaleString()} a ${tier.maxPoints.toLocaleString()} puntos`
                    : `Desde ${tier.minPoints.toLocaleString()} puntos`}
                </p>
              </div>

              <div className="mb-3">
                <p className="text-sm font-medium text-gray-900">
                  {tier.headline}
                </p>
              </div>

              <div>
                <ul className="space-y-1.5">
                  {tier.benefits.map((benefit, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-primary-600 mr-2">•</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

