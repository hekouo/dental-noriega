// src/app/not-found.tsx
import React from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import buttonStyles from "@/components/ui/button.module.css";

export default function NotFound() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">
        La página que buscas no existe.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href={ROUTES.home()} className={`${buttonStyles.primary} px-4`}>
          Ir al inicio
        </Link>
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
