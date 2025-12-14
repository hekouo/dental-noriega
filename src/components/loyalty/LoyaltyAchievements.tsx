"use client";

import { getTierForPoints } from "@/lib/loyalty/config";

type Props = {
  currentPoints: number;
  lifetimePoints: number;
  paidOrdersCount: number;
};

/**
 * Tipo para un logro (achievement)
 */
type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

/**
 * Calcula los logros desbloqueados basándose en puntos y pedidos
 */
function calculateAchievements(
  currentPoints: number,
  lifetimePoints: number,
  paidOrdersCount: number,
): Achievement[] {
  const currentTier = getTierForPoints(currentPoints);
  const isElite = currentTier.id === "elite";

  const achievements: Achievement[] = [
    {
      id: "first-purchase",
      name: "Primera compra",
      description: "Realizaste tu primer pedido",
      icon: "🎉",
      unlocked: paidOrdersCount >= 1,
    },
    {
      id: "frequent-customer",
      name: "Cliente frecuente",
      description: "Has realizado 5 o más pedidos",
      icon: "⭐",
      unlocked: paidOrdersCount >= 5,
    },
    {
      id: "store-expert",
      name: "Experto en la tienda",
      description: "Has realizado 10 o más pedidos",
      icon: "🏆",
      unlocked: paidOrdersCount >= 10,
    },
    {
      id: "thousand-points",
      name: "1,000 puntos alcanzados",
      description: "Acumulaste 1,000 puntos en total",
      icon: "💎",
      unlocked: lifetimePoints >= 1000,
    },
    {
      id: "five-thousand-points",
      name: "5,000 puntos acumulados",
      description: "Acumulaste 5,000 puntos en total",
      icon: "👑",
      unlocked: lifetimePoints >= 5000,
    },
    {
      id: "elite-tier",
      name: "Nivel Élite",
      description: "Alcanzaste el nivel máximo de lealtad",
      icon: "🌟",
      unlocked: isElite,
    },
  ];

  return achievements;
}

/**
 * Componente para mostrar logros (achievements) del usuario
 */
export default function LoyaltyAchievements({
  currentPoints,
  lifetimePoints,
  paidOrdersCount,
}: Props) {
  const achievements = calculateAchievements(currentPoints, lifetimePoints, paidOrdersCount);

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Logros</h2>
      <p className="text-sm text-gray-600 mb-6">
        Desbloquea logros especiales mientras realizas compras y acumulas puntos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`rounded-lg border-2 p-4 transition-all ${
              achievement.unlocked
                ? "bg-emerald-50 border-emerald-200 shadow-sm"
                : "bg-slate-50 border-slate-200 opacity-75"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`text-3xl ${
                  achievement.unlocked ? "opacity-100" : "opacity-50 grayscale"
                }`}
              >
                {achievement.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3
                    className={`text-sm font-semibold ${
                      achievement.unlocked ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {achievement.name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      achievement.unlocked
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {achievement.unlocked ? "Desbloqueado" : "Bloqueado"}
                  </span>
                </div>
                <p
                  className={`text-xs ${
                    achievement.unlocked ? "text-gray-700" : "text-gray-500"
                  }`}
                >
                  {achievement.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
