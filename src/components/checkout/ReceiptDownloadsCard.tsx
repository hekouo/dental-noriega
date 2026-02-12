"use client";

import React from "react";
import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export type ReceiptDownloadsCardProps = {
  orderId?: string | null;
  receiptUrl?: string | null;
  invoicePdfUrl?: string | null;
  customerEmail?: string | null;
};

/**
 * Tarjeta estilo Stripe para Recibo y facturación en /checkout/gracias.
 * Botones de descarga solo si existen URLs; si no, bloque "Cómo facturar" con CTAs a facturación y WhatsApp.
 */
export default function ReceiptDownloadsCard({
  orderId,
  receiptUrl,
  invoicePdfUrl,
  customerEmail,
}: ReceiptDownloadsCardProps) {
  const hasReceipt = !!receiptUrl;
  const hasInvoice = !!invoicePdfUrl;
  const hasAnyDownload = hasReceipt || hasInvoice;

  const whatsappHref = getWhatsAppUrl(
    "Hola, necesito ayuda con el recibo o factura de mi pedido.",
  );

  return (
    <section
      className="rounded-xl border border-stone-200/90 dark:border-gray-700 bg-stone-50/50 dark:bg-gray-800/50 p-5 sm:p-6 shadow-sm"
      aria-labelledby="receipt-card-title"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-800/50 flex items-center justify-center text-amber-700 dark:text-amber-300"
          aria-hidden
        >
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <h2
            id="receipt-card-title"
            className="text-base font-semibold text-gray-900 dark:text-white"
          >
            Recibo y facturación
          </h2>
          {orderId && (
            <p className="text-sm text-stone-600 dark:text-gray-400">
              Pedido {orderId}
            </p>
          )}

          {hasAnyDownload ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Descargas disponibles">
              {hasReceipt && (
                <a
                  href={receiptUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium focus-premium tap-feedback"
                  aria-label="Descargar recibo (abre en nueva pestaña)"
                >
                  <Download className="w-4 h-4" aria-hidden />
                  Descargar recibo
                </a>
              )}
              {hasInvoice && (
                <a
                  href={invoicePdfUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium focus-premium tap-feedback"
                  aria-label="Descargar factura (abre en nueva pestaña)"
                >
                  <Download className="w-4 h-4" aria-hidden />
                  Descargar factura
                </a>
              )}
            </div>
          ) : (
            <div role="status">
              <p className="text-sm text-stone-600 dark:text-gray-400 mb-2">
                La descarga del recibo/factura no está disponible aquí.
              </p>
              <p className="text-sm text-stone-600 dark:text-gray-400 mb-3">
                Si necesitas factura, usa el formulario de facturación o contáctanos por WhatsApp.
              </p>
              {customerEmail && (
                <p className="text-sm text-stone-500 dark:text-gray-500 mb-3">
                  Correo: {customerEmail}
                </p>
              )}
              <div className="flex flex-wrap gap-2" role="group" aria-label="Cómo facturar">
                <Link
                  href="/facturacion"
                  className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium focus-premium tap-feedback"
                  aria-label="Abrir formulario de facturación"
                >
                  Abrir formulario de facturación
                </Link>
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium focus-premium tap-feedback"
                    aria-label="Contactar por WhatsApp"
                  >
                    Contactar por WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
