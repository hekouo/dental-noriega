// src/app/error.tsx
"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import buttonStyles from "@/components/ui/button.module.css";

export default function ErrorPage({
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
        <button onClick={reset} className={`${buttonStyles.primary} px-4`}>
          Intentar de nuevo
        </button>
        <Link href={ROUTES.home()} className={`${buttonStyles.outline} px-4`}>
          Ir al inicio
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href={ROUTES.buscar()} className={`${buttonStyles.outline} px-4`}>
          Buscar productos
        </Link>
        <Link href={ROUTES.tienda()} className={`${buttonStyles.outline} px-4`}>
          Ver tienda
        </Link>
      </div>
    </main>
  );
}
