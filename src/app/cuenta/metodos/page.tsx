import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import buttonStyles from "@/components/ui/button.module.css";

export const metadata: Metadata = {
  title: "Métodos de Pago | Depósito Dental Noriega",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function MetodosPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-4">Métodos de Pago</h1>
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600 mb-6">Próximamente disponible</p>
        <p className="text-sm text-gray-500 mb-6">
          Estamos trabajando en esta funcionalidad. Pronto podrás gestionar tus
          métodos de pago guardados aquí.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/" className={`${buttonStyles.primary} px-4`}>
            Volver al inicio
          </Link>
          <Link href="/catalogo" className={`${buttonStyles.outline} px-4`}>
            Ir al catálogo
          </Link>
        </div>
      </div>
    </main>
  );
}
