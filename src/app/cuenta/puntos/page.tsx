"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { createClient } from "@/lib/supabase/client";
import { calculatePointsValue } from "@/lib/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Award, TrendingUp, TrendingDown } from "lucide-react";

const typeLabels: Record<string, string> = {
  earn: "Ganados",
  redeem: "Canjeados",
  adjust: "Ajuste",
};

const typeIcons: Record<string, any> = {
  earn: TrendingUp,
  redeem: TrendingDown,
  adjust: Award,
};

export default function PuntosPage() {
  const [profile, setProfile] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Load profile
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Load points ledger
      const { data: ledgerData } = await supabase
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AuthGuard>
    );
  }

  const balance = profile?.points_balance || 0;
  const value = calculatePointsValue(balance);

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Mis Puntos</h1>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 mb-2">Saldo actual</p>
              <p className="text-5xl font-bold">{balance}</p>
              <p className="text-primary-100 mt-2">
                puntos ≈ ${value.toFixed(2)} MXN de descuento
              </p>
            </div>
            <Award size={80} className="opacity-20" />
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4">
            ¿Cómo funcionan los puntos?
          </h2>
          <ul className="space-y-2 text-gray-600">
            <li>
              ✅ Gana <strong>1 punto por cada $10 MXN</strong> en tus compras
            </li>
            <li>
              ✅ Canjea <strong>100 puntos = $10 MXN</strong> de descuento
            </li>
            <li>✅ Puedes canjear hasta el 50% del total de tu pedido</li>
          </ul>
        </div>

        {/* Ledger */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="font-semibold text-lg">Historial de Movimientos</h2>
          </div>
          <div className="divide-y">
            {ledger.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">
                No hay movimientos aún. ¡Realiza tu primera compra!
              </p>
            ) : (
              ledger.map((entry) => {
                const Icon = typeIcons[entry.type];
                const isPositive = entry.points > 0;

                return (
                  <div
                    key={entry.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          isPositive ? "bg-green-100" : "bg-red-100"
                        }`}
                      >
                        <Icon
                          size={20}
                          className={
                            isPositive ? "text-green-600" : "text-red-600"
                          }
                        />
                      </div>
                      <div>
                        <p className="font-medium">{typeLabels[entry.type]}</p>
                        <p className="text-sm text-gray-500">
                          {format(
                            new Date(entry.created_at),
                            "d 'de' MMMM, yyyy",
                            {
                              locale: es,
                            },
                          )}
                        </p>
                        {entry.note && (
                          <p className="text-sm text-gray-400">{entry.note}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`font-bold text-lg ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {entry.points}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
