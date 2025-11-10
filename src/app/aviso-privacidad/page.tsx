import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { COMPANY, LAST_UPDATED } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Aviso de privacidad | Depósito Dental Noriega",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AvisoPrivacidadPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Aviso de Privacidad</h1>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section id="responsable">
          <h2 className="text-xl font-semibold mb-3">
            1. Responsable y Contacto
          </h2>
          <p>
            El responsable del tratamiento de sus datos personales es{" "}
            <strong>{COMPANY.name}</strong>, con domicilio en {COMPANY.address}.
          </p>
          <p>
            Para cualquier consulta respecto al tratamiento de sus datos
            personales, puede contactarnos:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Correo electrónico: {COMPANY.email}</li>
            <li>Teléfono: {COMPANY.phone}</li>
          </ul>
        </section>

        <section id="datos-recabados">
          <h2 className="text-xl font-semibold mb-3">2. Datos Recabados</h2>
          <p>Recabamos los siguientes tipos de datos personales:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Identificación:</strong> Nombre completo
            </li>
            <li>
              <strong>Contacto:</strong> Correo electrónico, teléfono, dirección
              de envío
            </li>
            <li>
              <strong>Compra:</strong> Información de pedidos, productos
              adquiridos, método de pago
            </li>
          </ul>
        </section>

        <section id="finalidades">
          <h2 className="text-xl font-semibold mb-3">3. Finalidades</h2>
          <p>Sus datos personales se utilizan para:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Procesar y cumplir sus pedidos</li>
            <li>Facturación y emisión de comprobantes</li>
            <li>Comunicación sobre el estado de sus pedidos</li>
            <li>Soporte y atención al cliente</li>
            <li>Gestión de devoluciones y reembolsos</li>
          </ul>
        </section>

        <section id="conservacion">
          <h2 className="text-xl font-semibold mb-3">
            4. Conservación y Seguridad
          </h2>
          <p>
            Conservaremos sus datos personales durante el tiempo necesario para
            cumplir con las finalidades señaladas y las obligaciones legales
            aplicables.
          </p>
          <p>
            Implementamos medidas técnicas y organizativas para proteger sus
            datos contra acceso no autorizado, pérdida o alteración.
          </p>
        </section>

        <section id="derechos-arco">
          <h2 className="text-xl font-semibold mb-3">
            5. Derechos ARCO y Cómo Ejercerlos
          </h2>
          <p>
            Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al
            tratamiento de sus datos personales (Derechos ARCO).
          </p>
          <p>
            Para ejercer estos derechos, envíe una solicitud por correo
            electrónico a {COMPANY.email}, indicando:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Su nombre completo</li>
            <li>Derecho que desea ejercer</li>
            <li>Documentos que acrediten su identidad</li>
          </ul>
          <p>
            Responderemos su solicitud en un plazo máximo de 20 días hábiles.
          </p>
        </section>

        <section id="transferencias">
          <h2 className="text-xl font-semibold mb-3">6. Transferencias</h2>
          <p>
            No transferiremos sus datos personales a terceros sin su
            consentimiento expreso, salvo cuando sea necesario para cumplir con
            obligaciones legales o para proveedores de servicios que actúen como
            encargados del tratamiento bajo nuestro control.
          </p>
        </section>

        <section id="cambios">
          <h2 className="text-xl font-semibold mb-3">
            7. Cambios al Aviso y Fecha de Vigencia
          </h2>
          <p>
            Nos reservamos el derecho de modificar este aviso de privacidad en
            cualquier momento. Los cambios entrarán en vigor al publicarse en
            esta página.
          </p>
          <p className="text-sm text-gray-500 mt-4">
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
