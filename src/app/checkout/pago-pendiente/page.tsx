import type { Metadata } from "next";
import { Suspense } from "react";
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

  // Si no hay orderId, renderizar directamente el estado de error
  if (!orderId || typeof orderId !== "string") {
    return (
      <PagoPendienteClient
        order={null}
        error="not-found"
      />
    );
  }

  // Cargar la orden en el servidor
  const { order, error } = await getPendingBankTransferOrder(orderId);

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <PagoPendienteClient order={order} error={error} />
    </Suspense>
  );
}

