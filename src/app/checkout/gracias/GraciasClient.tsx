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
        // TODO: fetch de orden usando sessionId si existe
        // e.g., if (sessionId) { const r = await fetch(`/api/orders?session_id=${sessionId}`); setOrder(await r.json()); }
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

      {/* TODO: render de detalles de order */}
    </div>
  );
}
