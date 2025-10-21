"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Loader2 } from "lucide-react";

export default function CheckoutPagoPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    try {
      const checkoutDataStr = localStorage.getItem("checkout_data");
      if (!checkoutDataStr) {
        setError("No hay datos de checkout. Regresa al paso anterior.");
      }
      // Aquí iría la integración real de pago (Stripe, etc.)
    } catch {
      setError("Error leyendo datos de checkout.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold mb-6">Pago</h1>

        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparando pago…</span>
          </div>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <p className="text-gray-700">Datos listos para pago.</p>
        )}
      </div>
    </AuthGuard>
  );
}
