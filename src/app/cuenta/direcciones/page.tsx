import { Metadata } from "next";
import DireccionesClient from "./DireccionesClient";

export const metadata: Metadata = {
  title: "Mis direcciones",
  description:
    "Gestiona tus direcciones de envío. Agrega, edita o elimina direcciones para facilitar tus compras.",
  robots: { index: false, follow: true },
  openGraph: {
    title: "Mis direcciones | Depósito Dental Noriega",
    description:
      "Gestiona tus direcciones de envío. Agrega, edita o elimina direcciones para facilitar tus compras.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default function DireccionesPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Mis Direcciones</h1>
      <DireccionesClient />
    </main>
  );
}
