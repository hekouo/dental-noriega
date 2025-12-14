"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase/client";

type LoyaltyHeaderSummary = {
  currentPoints: number;
  totalPoints: number;
  tierId: string;
  tierName: string;
};

/**
 * Badge de puntos de lealtad para el header
 * Solo se muestra si el usuario está autenticado y tiene puntos > 0
 */
export function LoyaltyHeaderBadge() {
  const [summary, setSummary] = useState<LoyaltyHeaderSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLoyaltySummary = async () => {
      const s = getBrowserSupabase();
      if (!s) {
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await s.auth.getUser();

        if (!user?.email) {
          setSummary(null);
          setLoading(false);
          return;
        }

        // Obtener resumen de lealtad desde la API
        const response = await fetch(
          `/api/account/loyalty?email=${encodeURIComponent(user.email)}`,
        );

        if (response.ok) {
          const data = await response.json();
          const pointsBalance = data.pointsBalance || 0;

          // Solo mostrar si tiene puntos > 0
          if (pointsBalance > 0) {
            // Obtener tier desde el cliente (importar getTierForPoints)
            const { getTierForPoints } = await import("@/lib/loyalty/config");
            const tier = getTierForPoints(pointsBalance);

            setSummary({
              currentPoints: pointsBalance,
              totalPoints: data.lifetimeEarned || 0,
              tierId: tier.id,
              tierName: tier.name,
            });
          } else {
            setSummary(null);
          }
        } else {
          setSummary(null);
        }
      } catch (error) {
        // Silenciar errores - no mostrar badge si falla
        if (process.env.NODE_ENV === "development") {
          console.error("[LoyaltyHeaderBadge] Error:", error);
        }
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    loadLoyaltySummary();

    // Escuchar cambios de autenticación
    const s = getBrowserSupabase();
    if (!s) return;

    const {
      data: { subscription },
    } = s.auth.onAuthStateChange(() => {
      loadLoyaltySummary();
    });

    return () => subscription.unsubscribe();
  }, []);

  // No mostrar nada si está cargando, no hay resumen, o no hay puntos
  if (loading || !summary || summary.currentPoints <= 0) {
    return null;
  }

  // Extraer número de nivel del tierName (ej: "Nivel 2 · Cliente frecuente" -> "2")
  const levelMatch = summary.tierName.match(/Nivel (\d+)/);
  const levelNumber = levelMatch ? levelMatch[1] : null;

  return (
    <Link
      href="/cuenta/puntos"
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 border border-amber-200 hover:bg-amber-100 transition-colors"
      title="Ver tus puntos y recompensas"
    >
      {/* Desktop: mostrar nivel y puntos */}
      <span className="hidden sm:inline-flex items-center gap-1">
        {levelNumber && (
          <span className="text-xs font-semibold text-amber-800">
            Nivel {levelNumber}
          </span>
        )}
        <span className="text-xs text-amber-700">·</span>
        <span className="text-xs text-amber-700">
          {summary.currentPoints.toLocaleString("es-MX")} pts
        </span>
      </span>
      {/* Mobile: solo puntos */}
      <span className="sm:hidden text-xs text-amber-700">
        {summary.currentPoints.toLocaleString("es-MX")} pts
      </span>
    </Link>
  );
}

