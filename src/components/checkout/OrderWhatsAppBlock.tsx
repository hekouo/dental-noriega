"use client";

import Link from "next/link";
import { buildWhatsAppOrderUrl } from "@/lib/whatsapp/order";

interface OrderWhatsAppBlockProps {
  context: "paid" | "pending";
  orderRef: string;
  totalCents: number;
  customerName?: string | null;
  customerEmail?: string | null;
}

export function OrderWhatsAppBlock(props: OrderWhatsAppBlockProps) {
  const { context, orderRef, totalCents, customerName, customerEmail } = props;

  const href = buildWhatsAppOrderUrl({
    context,
    orderRef,
    totalCents,
    customerName,
    customerEmail,
  });

  if (!href) return null;

  const isPaid = context === "paid";

  const title = isPaid
    ? "¿Tienes dudas sobre tu pedido?"
    : "¿Listo para enviar tu comprobante?";

  const description = isPaid
    ? "Si necesitas ayuda con tu pedido o quieres hacer un ajuste, mándanos mensaje por WhatsApp con tu número de pedido."
    : "Cuando tengas tu comprobante de transferencia, envíanoslo por WhatsApp para validar tu pago más rápido.";

  return (
    <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-xs text-emerald-800">{description}</p>
          <p className="mt-1 text-xs text-emerald-700">
            Pedido: <span className="font-mono font-semibold">{orderRef}</span>
          </p>
        </div>
        <div className="flex items-center justify-start sm:justify-end">
          <Link
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <span>WhatsApp</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

