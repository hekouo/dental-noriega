import { Suspense } from "react";
import type { Metadata } from "next";
import GuardsClient from "./GuardsClient";
import PagoClient from "./PagoClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pago",
  description:
    "Completa el pago de tu pedido de forma segura. Aceptamos tarjetas, OXXO y más métodos de pago.",
  robots: { index: false, follow: true },
  openGraph: {
    title: "Pago | Depósito Dental Noriega",
    description:
      "Completa el pago de tu pedido de forma segura. Aceptamos tarjetas, OXXO y más métodos de pago.",
    type: "website",
  },
};

export default function PagoPage() {
  return (
    <Suspense fallback={null}>
      <GuardsClient>
        <PagoClient />
      </GuardsClient>
    </Suspense>
  );
}
