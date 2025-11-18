import { Metadata } from "next";
import DireccionesClient from "./DireccionesClient";

export const metadata: Metadata = {
  title: "Mis Direcciones | Depósito Dental Noriega",
  robots: { index: false, follow: false },
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
