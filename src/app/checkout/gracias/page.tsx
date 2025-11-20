import { Suspense } from "react";
import type { Metadata } from "next";
import GraciasContent from "./GraciasContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Gracias por tu compra",
  description:
    "Tu pedido ha sido recibido. Te contactaremos pronto para coordinar el envío. Gracias por confiar en Depósito Dental Noriega.",
  robots: { index: false, follow: true },
  openGraph: {
    title: "Gracias por tu compra | Depósito Dental Noriega",
    description:
      "Tu pedido ha sido recibido. Te contactaremos pronto para coordinar el envío.",
    type: "website",
  },
};

export default function GraciasPage() {
  return (
    <Suspense
      fallback={<div className="max-w-3xl mx-auto px-4 py-10">Cargando...</div>}
    >
      <GraciasContent />
    </Suspense>
  );
}
