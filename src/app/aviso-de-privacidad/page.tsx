import React from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de privacidad | Depósito Dental Noriega",
  description:
    "Aviso de privacidad de Depósito Dental Noriega. Información sobre el tratamiento de datos personales, finalidades y derechos ARCO.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

export default function AvisoDePrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Aviso de privacidad
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Este documento describe cómo recopilamos, utilizamos y protegemos su
          información personal al utilizar nuestros servicios.
        </p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Responsable del tratamiento
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Depósito Dental Noriega es responsable del tratamiento de sus datos
              personales. Para cualquier consulta o solicitud relacionada con el
              tratamiento de sus datos, puede contactarnos a través de nuestros
              canales de atención al cliente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Datos que recopilamos
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Recopilamos los siguientes tipos de información personal:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Datos de identificación:</strong> Nombre completo,
                apellidos
              </li>
              <li>
                <strong>Datos de contacto:</strong> Correo electrónico, número
                telefónico, dirección de envío
              </li>
              <li>
                <strong>Datos de compra:</strong> Información sobre pedidos,
                productos adquiridos, historial de transacciones
              </li>
              <li>
                <strong>Datos de pago:</strong> Información necesaria para
                procesar pagos (manejada por procesadores de pago seguros)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. Finalidades del tratamiento
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Utilizamos sus datos personales para las siguientes finalidades:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Procesar y cumplir sus pedidos</li>
              <li>Gestionar el envío y entrega de productos</li>
              <li>Procesar pagos y facturación</li>
              <li>Comunicarnos con usted sobre el estado de sus pedidos</li>
              <li>Proporcionar atención al cliente y soporte</li>
              <li>Gestionar devoluciones, reembolsos y garantías</li>
              <li>Cumplir con obligaciones legales y fiscales</li>
              <li>Mejorar nuestros servicios y experiencia del cliente</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Derechos ARCO
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Usted tiene derecho a:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Acceder:</strong> Conocer qué datos personales tenemos
                sobre usted
              </li>
              <li>
                <strong>Rectificar:</strong> Solicitar la corrección de datos
                inexactos o incompletos
              </li>
              <li>
                <strong>Cancelar:</strong> Solicitar la eliminación de sus datos
                cuando ya no sean necesarios
              </li>
              <li>
                <strong>Oponerse:</strong> Oponerse al tratamiento de sus datos
                para ciertas finalidades
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Para ejercer estos derechos, puede contactarnos a través de
              nuestros canales de atención al cliente. Responderemos su
              solicitud en un plazo razonable conforme a la legislación
              aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Transferencias y compartir datos
            </h2>
            <p className="text-gray-700 leading-relaxed">
              No compartimos sus datos personales con terceros, excepto cuando
              sea necesario para:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mt-3">
              <li>Procesar pagos (a través de proveedores de pago seguros)</li>
              <li>Gestionar envíos (con servicios de paquetería)</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Todos nuestros proveedores están obligados a mantener la
              confidencialidad de sus datos y utilizarlos únicamente para los
              fines acordados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Seguridad de los datos
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Implementamos medidas técnicas y organizativas apropiadas para
              proteger sus datos personales contra acceso no autorizado,
              alteración, divulgación o destrucción. Sin embargo, ningún método
              de transmisión por Internet o almacenamiento electrónico es
              completamente seguro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. Conservación de datos
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Conservamos sus datos personales durante el tiempo necesario para
              cumplir con las finalidades para las que fueron recopilados y para
              cumplir con nuestras obligaciones legales, fiscales y de
              contabilidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              8. Cambios a este aviso
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Podemos actualizar este aviso de privacidad ocasionalmente. Cualquier
              cambio significativo será comunicado a través de nuestros canales
              habituales o mediante un aviso en nuestro sitio web. La fecha de
              última actualización se indicará al final de este documento.
            </p>
          </section>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 italic">
              Este documento es informativo. Puedes solicitar más detalles por
              WhatsApp.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="text-primary-600 hover:text-primary-700 underline underline-offset-2 transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

