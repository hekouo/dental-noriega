// src/app/error.tsx
"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">Algo salió mal</h1>
      <p className="text-xl text-gray-600 mb-8">
        Hubo un error al cargar esta página.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
        <button onClick={reset} className="btn btn-primary">
          Intentar de nuevo
        </button>
        <Link href={ROUTES.home()} className="btn btn-outline">
          Ir al inicio
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href={ROUTES.buscar()} className="btn btn-outline">
          Buscar productos
        </Link>
        <Link href={ROUTES.tienda()} className="btn btn-outline">
          Ver tienda
        </Link>
      </div>
    </main>
  );
}

