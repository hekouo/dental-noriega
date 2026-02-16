"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import { buttonPrimary } from "@/lib/styles/button";

/**
 * CTA final editorial: /tienda, /facturacion (o /contacto fallback), WhatsApp.
 * QR placeholder visual (sin librerías).
 */
export default function FinalCTA() {
  const waUrl = getWhatsAppUrl("Hola, me interesa hacer un pedido.");
  const facturacionHref = "/facturacion";

  return (
    <section
      className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
      aria-labelledby="final-cta-heading"
    >
      <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm shadow-sm p-6 sm:p-8">
        <h2
          id="final-cta-heading"
          className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white text-center mb-2"
        >
          Listo para comprar
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm sm:text-base mb-6 max-w-lg mx-auto">
          Insumos dentales confiables, entregados a todo México. Atención por WhatsApp y facturación electrónica.
        </p>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 sm:gap-12 lg:gap-16">
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <Link
            href={ROUTES.tienda()}
            className={`${buttonPrimary} text-base sm:text-lg px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl min-h-[48px] inline-flex items-center justify-center`}
            aria-label="Ver tienda"
          >
            Ver tienda
          </Link>
          <Link
            href={facturacionHref}
            className="rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-6 py-3 font-semibold hover:border-primary-400 dark:hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[48px] inline-flex items-center justify-center"
            aria-label="Facturación"
          >
            Facturación
          </Link>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-6 py-3 font-semibold hover:border-green-400 dark:hover:border-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 min-h-[48px] inline-flex items-center justify-center gap-2"
              aria-label="Contactar por WhatsApp"
            >
              <MessageCircle className="w-5 h-5" aria-hidden />
              WhatsApp
            </a>
          )}
        </div>

        {/* QR placeholder visual - sin libs */}
        <div
          className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center"
          aria-hidden
        >
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            QR
          </span>
        </div>
        </div>
      </div>
    </section>
  );
}
