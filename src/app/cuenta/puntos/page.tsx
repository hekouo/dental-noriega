import { redirect } from "next/navigation";
import { createActionSupabase } from "@/lib/supabase/server-actions";
import { getOrdersByEmail } from "@/lib/supabase/orders.server";
import { getLoyaltySummaryByEmail } from "@/lib/loyalty/points.server";
import { calculateLoyaltyHistory } from "@/lib/loyalty/history";
import LoyaltySummaryCard from "@/components/loyalty/LoyaltySummaryCard";
import LoyaltyRewardsTable from "@/components/loyalty/LoyaltyRewardsTable";
import LoyaltyHistoryTable from "@/components/loyalty/LoyaltyHistoryTable";
import LoyaltyAchievements from "@/components/loyalty/LoyaltyAchievements";
import AccountSectionHeader from "@/components/account/AccountSectionHeader";
import LoyaltyPageTracker from "./LoyaltyPageTracker.client";

/**
 * Página dedicada de puntos de lealtad
 * Muestra resumen, tabla de niveles, historial y logros
 */
export default async function PuntosPage() {
  // Obtener usuario autenticado
  const supabase = createActionSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    // Si no está autenticado, redirigir a login o página de cuenta
    redirect("/cuenta");
  }

  const userEmail = user.email.trim().toLowerCase();

  // Obtener datos en paralelo
  const [loyaltySummary, orders] = await Promise.all([
    getLoyaltySummaryByEmail(userEmail),
    getOrdersByEmail(userEmail, { limit: 100 }), // Obtener más órdenes para el historial
  ]);

  // Calcular historial de puntos
  const history = calculateLoyaltyHistory(orders);

  // Contar pedidos pagados para logros
  const paidOrdersCount = orders.filter((order) => order.status === "paid").length;

  // Obtener nombre completo del usuario si está disponible
  const userFullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name ||
    null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Tus puntos y beneficios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consulta tu historial de puntos, niveles y logros desbloqueados.
        </p>
      </header>

      <AccountSectionHeader
        user={{ email: userEmail, fullName: userFullName }}
        currentSection="puntos"
      />

      <div className="mt-6 space-y-6">
        {/* Tracker de analytics */}
        <LoyaltyPageTracker
          currentPoints={loyaltySummary?.pointsBalance ?? 0}
          totalPoints={loyaltySummary?.lifetimeEarned ?? 0}
        />

        {/* Sección 1: Resumen de puntos */}
        <LoyaltySummaryCard
          pointsBalance={loyaltySummary?.pointsBalance ?? 0}
          lifetimeEarned={loyaltySummary?.lifetimeEarned ?? 0}
          loading={false}
          error={null}
          showLinkToDetail={false}
        />

        {/* Sección 2: Tabla de niveles / recompensas */}
        <LoyaltyRewardsTable currentPoints={loyaltySummary?.pointsBalance ?? 0} />

        {/* Sección 3: Historial de puntos */}
        <LoyaltyHistoryTable entries={history.entries} />

        {/* Sección 4: Logros (achievements) */}
        <LoyaltyAchievements
          currentPoints={loyaltySummary?.pointsBalance ?? 0}
          lifetimePoints={loyaltySummary?.lifetimeEarned ?? 0}
          paidOrdersCount={paidOrdersCount}
        />
      </div>
    </div>
  );
}
