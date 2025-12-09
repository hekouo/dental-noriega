import type { Metadata } from "next";
import PagoPendienteClient from "./PagoPendienteClient";
import { getPendingBankTransferOrder } from "@/lib/orders/getPendingBankTransferOrder.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pago Pendiente",
  description: "Instrucciones para completar tu pago",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ order?: string }>;
};

export default async function PagoPendientePage({ searchParams }: Props) {
  const params = await searchParams;
  const orderId = params.order;

  // Si no hay orderId, pasar null y error not-found
  if (!orderId || typeof orderId !== "string") {
    return <PagoPendienteClient order={null} error="not-found" />;
  }

  // Cargar la orden en el servidor
  const { order, error } = await getPendingBankTransferOrder(orderId);

  return <PagoPendienteClient order={order} error={error} />;
}

