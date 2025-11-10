"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { formatMXN } from "@/lib/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import dynamicImport from "next/dynamic";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

// Dynamic imports para iconos no críticos (tipados como componentes SVG)
const Award = dynamicImport(
  () => import("lucide-react").then((mod) => ({ default: mod.Award })),
  { ssr: false },
) as unknown as IconType;
const TrendingUp = dynamicImport(
  () => import("lucide-react").then((mod) => ({ default: mod.TrendingUp })),
  { ssr: false },
) as unknown as IconType;
const TrendingDown = dynamicImport(
  () => import("lucide-react").then((mod) => ({ default: mod.TrendingDown })),
  { ssr: false },
) as unknown as IconType;

const typeLabels: Record<string, string> = {
  earn: "Ganados",
  redeem: "Canjeados",
  adjust: "Ajuste",
};

const typeIcons: Record<string, IconType> = {
  earn: TrendingUp,
  redeem: TrendingDown,
  adjust: Award,
};

type UserProfile = {
  points_balance: number;
};

type LedgerItem = {
  id: string;
  type: string;
  points: number;
  created_at: string;
  description?: string | null;
  order_id?: string | null;
};

export default function PuntosPageClient() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = getBrowserSupabase();
    if (!s) {
      setIsLoading(false);
      return;
    }
    const {
      data: { user },
    } = await s.auth.getUser();

    if (user) {
      // Load profile
      const { data: profileData } = await s
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Load points ledger
      const { data: ledgerData } = await s
        .from("points_ledger")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setLedger(ledgerData || []);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" aria-hidden="true"></div>
          <span className="sr-only">Cargando...</span>
        </div>
      </AuthGuard>
    );
  }

  const balance = profile?.points_balance || 0;
  const balanceValue = formatMXN(balance * 0.01); // 1 punto = $0.01 MXN

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Mis Puntos
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-primary-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-primary-600 mb-1">
                  Balance Actual
                </h3>
                <p className="text-2xl font-bold text-primary-900">
                  {balance.toLocaleString()} pts
                </p>
                <p className="text-sm text-primary-600">≈ {balanceValue}</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-600 mb-1">
                  Ganados este mes
                </h3>
                <p className="text-2xl font-bold text-green-900">
                  {ledger
                    .filter(
                      (item) =>
                        item.type === "earn" &&
                        new Date(item.created_at).getMonth() ===
                          new Date().getMonth(),
                    )
                    .reduce((sum, item) => sum + item.points, 0)
                    .toLocaleString()}{" "}
                  pts
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-600 mb-1">
                  Canjeados este mes
                </h3>
                <p className="text-2xl font-bold text-blue-900">
                  {ledger
                    .filter(
                      (item) =>
                        item.type === "redeem" &&
                        new Date(item.created_at).getMonth() ===
                          new Date().getMonth(),
                    )
                    .reduce((sum, item) => sum + item.points, 0)
                    .toLocaleString()}{" "}
                  pts
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Historial de Puntos
            </h2>

            {ledger.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay historial de puntos aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ledger.map((item) => {
                  const Icon: IconType = typeIcons[item.type] ?? Award;
                  const isPositive = item.type === "earn";

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-full ${
                            isPositive ? "bg-green-100" : "bg-red-100"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              isPositive ? "text-green-600" : "text-red-600"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {typeLabels[item.type] || item.type}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(item.created_at), "PPP", {
                              locale: es,
                            })}
                          </p>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            isPositive ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isPositive ? "+" : "-"}
                          {item.points.toLocaleString()} pts
                        </p>
                        {item.order_id && (
                          <p className="text-xs text-gray-500">
                            Orden #{item.order_id}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

