// src/app/not-found.tsx
import React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export default function NotFound() {
  const whatsappUrl = getWhatsAppUrl("Hola, necesito ayuda para encontrar un producto en el sitio.");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Search className="w-12 h-12 text-gray-400" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Página no encontrada
          </h1>
          <p className="text-gray-600 mb-8">
            No encontramos esta página. Puede que el enlace esté roto o el producto ya no exista.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={ROUTES.catalogIndex()}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              aria-label="Ir al catálogo"
            >
              Ir al catálogo
            </Link>
            <Link
              href={ROUTES.home()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              aria-label="Ir al inicio"
            >
              Ir al inicio
            </Link>
          </div>
          {whatsappUrl && (
            <Link
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-green-500 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
              aria-label="Hablar por WhatsApp"
            >
              Hablar por WhatsApp
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

