import { Suspense } from "react";
import type { Metadata } from "next";
import PagoPendienteClient from "./PagoPendienteClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pago Pendiente",
  description: "Instrucciones para completar tu pago",
  robots: { index: false, follow: false },
};

export default function PagoPendientePage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <PagoPendienteClient />
    </Suspense>
  );
}

