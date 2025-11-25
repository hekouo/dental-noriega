"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase/client";
import AccountInfoBanner from "@/components/account/AccountInfoBanner";
import type { User } from "@supabase/supabase-js";

type DashboardClientProps = {
  user: User;
  searchParams: { verified?: string; error?: string };
};

export default function DashboardClient({
  user,
  searchParams,
}: DashboardClientProps) {
  const [loyaltyPoints, setLoyaltyPoints] = useState<{
    pointsBalance: number;
    lifetimeEarned: number;
    canApplyDiscount: boolean;
  } | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(true);

  const fullName =
    (user.user_metadata &&
      (user.user_metadata.full_name || user.user_metadata.fullName)) ||
    "";
  const phone =
    (user.user_metadata &&
      (user.user_metadata.phone || user.user_metadata.telefono)) ||
    "";
  const isEmailVerified = !!user.email_confirmed_at;

  useEffect(() => {
    const loadLoyaltyPoints = async () => {
      if (!user.email) return;

      try {
        const response = await fetch(
          `/api/account/loyalty?email=${encodeURIComponent(user.email)}`,
        );
        if (response.ok) {
          const data = await response.json();
          setLoyaltyPoints({
            pointsBalance: data.pointsBalance || 0,
            lifetimeEarned: data.lifetimeEarned || 0,
            canApplyDiscount: data.canApplyDiscount || false,
          });
        }
      } catch (err) {
        console.error("[DashboardClient] Error al cargar puntos:", err);
      } finally {
        setLoyaltyLoading(false);
      }
    };

    loadLoyaltyPoints();
  }, [user.email]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Mi cuenta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona tu perfil, direcciones, pedidos y puntos de lealtad.
        </p>
      </header>

      <AccountInfoBanner showVerified={searchParams.verified === "1"} />

      {searchParams.error && (
        <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <p className="text-sm text-red-800">
            {searchParams.error === "auth"
              ? "Hubo un problema con la autenticación. Intenta de nuevo."
              : "Ocurrió un error. Intenta de nuevo."}
          </p>
        </div>
      )}

      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Resumen de cuenta
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Correo</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {user.email}
                </span>
                {isEmailVerified ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pendiente
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Nombre</span>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {fullName || (
                  <span className="text-gray-400">Sin nombre todavía</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Teléfono</span>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {phone || <span className="text-gray-400">No registrado</span>}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Puntos de lealtad</span>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {loyaltyLoading ? (
                  <span className="text-gray-400">Cargando...</span>
                ) : (
                  <span className="text-lg font-semibold text-primary-600">
                    {loyaltyPoints?.pointsBalance.toLocaleString() || 0}
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Accesos rápidos
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              href="/cuenta/perfil"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition text-gray-700"
            >
              Mi perfil
            </Link>
            <Link
              href="/cuenta/direcciones"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition text-gray-700"
            >
              Mis direcciones
            </Link>
            <Link
              href="/cuenta/pedidos"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition text-gray-700"
            >
              Mis pedidos
            </Link>
            <Link
              href="/cuenta/puntos"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition text-gray-700"
            >
              Ver puntos de lealtad
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

