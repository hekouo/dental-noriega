"use client";

import Link from "next/link";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { getSelectedItems, getSelectedSubtotalCents } from "@/lib/checkout/selection";
import { buildWhatsAppOrderUrl } from "@/lib/whatsapp/order";

export default function CheckoutWhatsAppHelpBlock() {
  const checkoutItems = useCheckoutStore((s) => s.checkoutItems);
  const shippingMethod = useCheckoutStore((s) => s.shippingMethod);
  const datos = useCheckoutStore((s) => s.datos);

  const selectedItems = getSelectedItems(checkoutItems);
  const subtotalCents = getSelectedSubtotalCents(checkoutItems);

  // No renderizar si no hay items o subtotal es 0
  if (selectedItems.length === 0 || subtotalCents <= 0) {
    return null;
  }

  const href = buildWhatsAppOrderUrl({
    context: "checkout-help",
    subtotalCents,
    shippingMethod: shippingMethod || undefined,
    itemsCount: selectedItems.length,
    customerName: datos?.name || null,
    customerEmail: datos?.email || null,
  });

  // No renderizar si no hay teléfono configurado
  if (!href) return null;

  return (
    <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">¿Necesitas ayuda antes de pagar?</p>
          <p className="mt-1 text-xs text-emerald-800">
            Escríbenos por WhatsApp y compártenos tu pedido. Podemos ayudarte con dudas de
            transferencia o pago con tarjeta.
          </p>
        </div>
        <div className="flex items-center justify-start sm:justify-end">
          <Link
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <span>Pedir ayuda por WhatsApp</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

