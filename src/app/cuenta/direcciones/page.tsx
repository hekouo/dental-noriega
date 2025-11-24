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
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Mis direcciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona tus direcciones de envío para facilitar tus compras.
        </p>
      </header>
      <DireccionesClient />
    </main>
  );
}
