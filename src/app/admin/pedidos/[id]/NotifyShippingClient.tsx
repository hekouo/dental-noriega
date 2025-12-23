"use client";

import Link from "next/link";
import { buildShippingNotificationUrl } from "@/lib/whatsapp/shipping";

type Props = {
  orderRef: string;
  trackingNumber: string | null;
  labelUrl: string | null;
  shippingStatus: string | null;
  shippingProvider: string | null;
  customerName: string | null;
  customerEmail: string | null;
};

export default function NotifyShippingClient({
  orderRef,
  trackingNumber,
  labelUrl,
  shippingStatus,
  shippingProvider,
  customerName,
  customerEmail,
}: Props) {
  // Solo mostrar si hay tracking_number o label_url
  if (!trackingNumber && !labelUrl) {
    return null;
  }

  const whatsappUrl = buildShippingNotificationUrl({
    orderRef,
    trackingNumber,
    labelUrl,
    shippingStatus,
    shippingProvider,
    customerName,
    customerEmail,
  });

  if (!whatsappUrl) {
    return null;
  }

  return (
    <div className="mt-4">
      <Link
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
      >
        <span>📱</span>
        <span>Notificar tracking al cliente (WhatsApp)</span>
      </Link>
    </div>
  );
}

