import React from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contrato de compra | Depósito Dental Noriega",
  description:
    "Contrato de compra de Depósito Dental Noriega. Términos y condiciones de compra, pagos, envíos y devoluciones.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

export default function ContratoDeCompraPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Contrato de compra
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Este documento establece los términos y condiciones que rigen las
          compras realizadas a través de Depósito Dental Noriega.
        </p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Aceptación de los términos
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Al realizar una compra en Depósito Dental Noriega, usted acepta
              los términos y condiciones establecidos en este contrato. Si no
              está de acuerdo con alguno de estos términos, por favor no realice
              una compra.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Proceso de compra
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              El proceso de compra incluye los siguientes pasos:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Selección de productos en el catálogo</li>
              <li>Agregar productos al carrito de compras</li>
              <li>Revisar el resumen del pedido</li>
              <li>Proporcionar datos de contacto y dirección de envío</li>
              <li>Seleccionar método de pago</li>
              <li>Confirmar y realizar el pago</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Una vez completado el proceso de pago, recibirá una confirmación
              de pedido por correo electrónico.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. Precios y pagos
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Todos los precios se muestran en pesos mexicanos (MXN) e incluyen
              impuestos aplicables, salvo que se indique lo contrario.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                Nos reservamos el derecho de modificar los precios en cualquier
                momento, pero los pedidos confirmados mantendrán el precio
                acordado
              </li>
              <li>
                Aceptamos diversos métodos de pago, incluyendo tarjetas de
                crédito y débito, transferencias bancarias y otros métodos
                disponibles
              </li>
              <li>
                El pago debe completarse antes del envío de los productos, salvo
                acuerdos especiales
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Envíos y entregas
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Realizamos envíos a toda la República Mexicana:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                Los tiempos de entrega dependen de la ubicación y el método de
                envío seleccionado
              </li>
              <li>
                Los costos de envío se calculan según el peso, dimensiones y
                destino del paquete
              </li>
              <li>
                Ofrecemos envío gratuito en pedidos que cumplan con el monto
                mínimo establecido
              </li>
              <li>
                Usted es responsable de proporcionar una dirección de envío
                correcta y completa
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Una vez que el paquete sea entregado al servicio de paquetería,
              compartiremos con usted el número de rastreo para que pueda
              seguir su pedido.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Devoluciones y cancelaciones
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Política de devoluciones y cancelaciones:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                Puede solicitar la cancelación de su pedido antes de que sea
                enviado
              </li>
              <li>
                Las devoluciones se aceptan dentro del plazo establecido,
                siempre que los productos estén en condiciones originales y sin
                uso
              </li>
              <li>
                Los productos deben devolverse en su embalaje original con todos
                los accesorios incluidos
              </li>
              <li>
                Los costos de envío de devoluciones pueden ser responsabilidad
                del cliente, salvo que la devolución sea por error nuestro o
                producto defectuoso
              </li>
              <li>
                Los reembolsos se procesarán utilizando el mismo método de pago
                utilizado en la compra original
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Disponibilidad de productos
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Hacemos nuestro mejor esfuerzo para mantener el catálogo actualizado
              y mostrar solo productos disponibles. Si un producto no está
              disponible al momento de su pedido, nos comunicaremos con usted
              para ofrecer alternativas o procesar un reembolso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. Garantías y responsabilidad
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Nuestros productos están sujetos a las garantías del fabricante y
              las leyes de protección al consumidor aplicables.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                Somos responsables de defectos de fabricación o productos que no
                correspondan con la descripción
              </li>
              <li>
                No nos hacemos responsables de daños derivados del uso
                inadecuado de los productos
              </li>
              <li>
                La responsabilidad se limita al valor del producto adquirido
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              8. Modificaciones al contrato
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Nos reservamos el derecho de modificar estos términos y condiciones
              en cualquier momento. Las modificaciones entrarán en vigor al
              publicarse en nuestro sitio web. Los pedidos confirmados antes de
              una modificación se regirán por los términos vigentes al momento
              de la confirmación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              9. Ley aplicable y jurisdicción
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Este contrato se rige por las leyes de los Estados Unidos Mexicanos.
              Cualquier disputa que surja en relación con este contrato será
              sometida a la jurisdicción de los tribunales competentes en México.
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

