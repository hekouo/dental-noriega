"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function GraciasClient() {
  const sp = useSearchParams();
  const sessionId = sp?.get("session_id") ?? "";
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        if (sessionId) {
          // Nota: si tienes un endpoint, puedes consultar detalles del pedido aquí.
          await fetch(
            `/api/orders?session_id=${encodeURIComponent(sessionId)}`,
            {
              cache: "no-store",
            },
          ).catch(() => {});
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [sessionId]);

  if (isLoading) return <p>Procesando pago…</p>;
  if (!sessionId) return <p>No encontramos tu sesión de pago.</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold">¡Gracias por tu compra!</h1>
      {/* Aquí puedes renderizar detalles del pedido si los tienes */}
    </div>
  );
}
