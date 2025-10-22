/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Envíos",
  description: "Información sobre envíos y entregas de DENTAL NORIEGA",
};

export default function EnviosPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Política de Envíos</h1>

      <div className="prose prose-gray max-w-none">
        <h2 className="text-xl font-semibold mt-6 mb-3">Cobertura</h2>
        <p className="mb-4">
          Realizamos envíos a toda la República Mexicana. Los tiempos de entrega
          varían según la ubicación.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-3">Tiempos de entrega</h2>
        <ul className="list-disc pl-6 mb-4">
          <li>Ciudad de México y Área Metropolitana: 1-3 días hábiles</li>
          <li>Interior de la República: 3-7 días hábiles</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-3">Recogida en tienda</h2>
        <p className="mb-4">
          También puedes recoger tu pedido sin costo en nuestra ubicación en
          Ciudad de México. Contáctanos por WhatsApp para coordinar la recogida.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-3">Contacto</h2>
        <p className="mb-4">
          Para consultas sobre envíos, contáctanos por WhatsApp al{" "}
          <a
            href="https://wa.me/525531033715"
            className="text-blue-600 hover:underline"
          >
            +52 55 3103 3715
          </a>
        </p>
      </div>
    </div>
  );
}
