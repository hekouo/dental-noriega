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
 * Tarjeta estilo Stripe para Recibo / Factura en /checkout/gracias.
 * Botones solo si existen URLs; si no, estado "no disponible" + CTAs a facturación y WhatsApp.
 */
export default function ReceiptDownloadsCard({
  orderId,
  receiptUrl,
  invoicePdfUrl,
  customerEmail: _customerEmail,
}: ReceiptDownloadsCardProps) {
  const hasReceipt = !!receiptUrl;
  const hasInvoice = !!invoicePdfUrl;
  const hasAnyDownload = hasReceipt || hasInvoice;

  const whatsappHref = getWhatsAppUrl(
    "Hola, necesito ayuda con el recibo o factura de mi pedido.",
  );

  return (
    <div className="rounded-xl border border-stone-200/90 dark:border-gray-700 bg-stone-50/50 dark:bg-gray-800/50 p-5 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-800/50 flex items-center justify-center text-amber-700 dark:text-amber-300">
          <FileText className="w-5 h-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Recibo / Factura
          </h3>
          {orderId && (
            <p className="text-sm text-stone-600 dark:text-gray-400 mb-3">
              Pedido {orderId}
            </p>
          )}

          {hasAnyDownload ? (
            <div className="flex flex-wrap gap-2">
              {hasReceipt && (
                <a
                  href={receiptUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium focus-premium tap-feedback"
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
                >
                  <Download className="w-4 h-4" aria-hidden />
                  Descargar factura
                </a>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-600 dark:text-gray-400 mb-3">
                El recibo o factura estarán disponibles por correo o en tu cuenta. Si necesitas una copia, puedes solicitarla.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/facturacion"
                  className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium focus-premium tap-feedback"
                >
                  Información de facturación
                </Link>
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-sm font-medium focus-premium tap-feedback"
                  >
                    Pedir por WhatsApp
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
