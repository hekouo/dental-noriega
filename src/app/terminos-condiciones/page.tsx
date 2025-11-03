import React from "react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y condiciones | Depósito Dental Noriega",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const COMPANY = {
  name: "Depósito Dental Noriega",
  email: "contacto@tudominio.com",
  address: "CDMX, México",
  phone: "55 3103 3715",
};

const LAST_UPDATED = "2025-11-03";

export default function TerminosCondicionesPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Términos y Condiciones</h1>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section id="objeto">
          <h2 className="text-xl font-semibold mb-3">
            1. Objeto del Sitio y Definiciones
          </h2>
          <p>
            El presente sitio web es operado por <strong>{COMPANY.name}</strong>{" "}
            y tiene como objeto la comercialización de insumos y equipos
            dentales.
          </p>
          <p>
            Al utilizar este sitio, usted acepta estos términos y condiciones en
            su totalidad.
          </p>
        </section>

        <section id="precios">
          <h2 className="text-xl font-semibold mb-3">
            2. Precios, Disponibilidad y Errores
          </h2>
          <p>
            Todos los precios están expresados en pesos mexicanos (MXN) e
            incluyen IVA cuando aplica.
          </p>
          <p>
            Nos reservamos el derecho de corregir errores en precios o
            disponibilidad de productos. Si detectamos un error, le
            notificaremos y le ofreceremos la opción de confirmar su pedido al
            precio correcto o cancelarlo sin costo.
          </p>
        </section>

        <section id="pedidos">
          <h2 className="text-xl font-semibold mb-3">
            3. Pedidos y Cancelaciones
          </h2>
          <p>
            Al realizar un pedido, usted hace una oferta de compra. Nos
            reservamos el derecho de aceptar o rechazar cualquier pedido.
          </p>
          <p>
            Puede cancelar su pedido antes de que sea procesado contactándonos a{" "}
            {COMPANY.email} o {COMPANY.phone}.
          </p>
          <p>
            Una vez procesado el pedido, las cancelaciones están sujetas a
            nuestra política de devoluciones.
          </p>
        </section>

        <section id="envios">
          <h2 className="text-xl font-semibold mb-3">4. Envíos y Riesgos</h2>
          <p>
            Coordinaremos el envío de su pedido una vez confirmado el pago. Los
            tiempos y costos de envío se informarán durante el proceso de
            compra.
          </p>
          <p>
            El riesgo de pérdida o daño de los productos se transfiere a usted
            una vez que el transportista recibe los productos para su entrega.
          </p>
        </section>

        <section id="garantias">
          <h2 className="text-xl font-semibold mb-3">
            5. Garantías y Devoluciones
          </h2>
          <p>
            Todos los productos son nuevos y provienen directamente de
            fabricantes o distribuidores autorizados.
          </p>
          <p>
            Aceptamos devoluciones dentro de los 7 días posteriores a la
            recepción del producto, siempre que esté en su empaque original y
            sin usar.
          </p>
          <p>
            Los costos de envío de devoluciones corren por cuenta del cliente,
            salvo que el producto sea defectuoso o no corresponda al pedido
            realizado.
          </p>
        </section>

        <section id="limitacion">
          <h2 className="text-xl font-semibold mb-3">
            6. Limitación de Responsabilidad
          </h2>
          <p>
            {COMPANY.name} no se hace responsable de daños indirectos,
            incidentales o consecuentes derivados del uso de los productos
            adquiridos.
          </p>
          <p>
            Nuestra responsabilidad se limita al valor del producto adquirido.
          </p>
        </section>

        <section id="ley">
          <h2 className="text-xl font-semibold mb-3">
            7. Ley Aplicable y Jurisdicción
          </h2>
          <p>
            Estos términos se rigen por las leyes de los Estados Unidos
            Mexicanos.
          </p>
          <p>
            Cualquier controversia será resuelta en los tribunales competentes
            de {COMPANY.address}.
          </p>
        </section>

        <section id="actualizacion">
          <h2 className="text-xl font-semibold mb-3">
            8. Última Actualización
          </h2>
          <p className="text-sm text-gray-500">
            Última actualización: {LAST_UPDATED}
          </p>
        </section>
      </div>

      <div className="mt-8 pt-6 border-t">
        <Link href="/" className="text-primary-600 hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
