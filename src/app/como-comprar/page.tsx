import Link from "next/link";
import type { Metadata } from "next";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import { ROUTES } from "@/lib/routes";
import { FREE_SHIPPING_THRESHOLD_MXN } from "@/lib/shipping/freeShipping";
import {
  LOYALTY_POINTS_PER_MXN,
  LOYALTY_MIN_POINTS_FOR_DISCOUNT,
  LOYALTY_DISCOUNT_PERCENT,
} from "@/lib/loyalty/config";

export const metadata: Metadata = {
  title: "Cómo comprar | Depósito Dental Noriega",
  description:
    "Guía rápida para comprar insumos dentales en Depósito Dental Noriega. Información sobre envíos, envío gratis, puntos de lealtad, pagos y atención por WhatsApp.",
  openGraph: {
    title: "Cómo comprar | Depósito Dental Noriega",
    description:
      "Guía rápida para comprar insumos dentales. Envíos a todo México, envío gratis desde $2,000 MXN, puntos de lealtad y atención personalizada.",
    type: "website",
  },
};

export default function ComoComprarPage() {
  const whatsappUrl = getWhatsAppUrl();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mb-4">
        Insumos dentales para consultorios y clínicas en México
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Guía rápida para comprar en Depósito Dental Noriega
      </p>

      <div className="prose prose-gray max-w-none space-y-8">
        {/* Quiénes somos */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Quiénes somos
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Depósito Dental Noriega es una tienda familiar de insumos dentales en
            México. Nos especializamos en atender a consultorios, clínicas y
            ortodoncistas con productos de calidad y un servicio directo y
            personalizado.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Ofrecemos atención directa por WhatsApp para ayudarte a elegir los
            productos correctos según tu práctica y presupuesto.
          </p>
        </section>

        {/* Cómo comprar */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Cómo comprar
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>
              <strong>Explora nuestros productos:</strong> Navega por{" "}
              <Link
                href={ROUTES.tienda()}
                className="text-primary-600 hover:underline"
              >
                la tienda
              </Link>
              ,{" "}
              <Link
                href={ROUTES.destacados()}
                className="text-primary-600 hover:underline"
              >
                productos destacados
              </Link>{" "}
              o las secciones del{" "}
              <Link
                href={ROUTES.catalogIndex()}
                className="text-primary-600 hover:underline"
              >
                catálogo
              </Link>
              .
            </li>
            <li>
              <strong>Agrega al carrito:</strong> Haz clic en "Agregar al
              carrito" o usa "Comprar ahora" para ir directo al checkout.
            </li>
            <li>
              <strong>Completa tus datos:</strong> En el checkout, ingresa tu
              información de contacto, dirección de envío y método de pago.
            </li>
            <li>
              <strong>Confirma tu pedido:</strong> Revisa el resumen y confirma
              tu compra. Recibirás un correo con los detalles del pedido.
            </li>
          </ol>
        </section>

        {/* Envíos y envío gratis */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Envíos y envío gratis
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Realizamos envíos a todo México con opciones de envío estándar y
            express. La guía de rastreo se comparte por WhatsApp o correo
            electrónico una vez que tu pedido sea despachado.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
            <p className="text-gray-800 font-medium mb-2">
              🚚 Envío gratis desde ${FREE_SHIPPING_THRESHOLD_MXN.toLocaleString()} MXN
            </p>
            <p className="text-sm text-gray-700">
              En pedidos desde ${FREE_SHIPPING_THRESHOLD_MXN.toLocaleString()} MXN en productos (subtotal sin incluir
              envío), el envío es completamente gratis. El umbral se calcula sobre
              el subtotal de productos antes de aplicar cualquier descuento.
            </p>
          </div>
        </section>

        {/* Atención por WhatsApp */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Atención por WhatsApp
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Estamos disponibles para ayudarte antes, durante y después de tu
            compra. Puedes contactarnos de dos formas:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Botón flotante de WhatsApp:</strong> Visible en todas las
              páginas (excepto checkout y cuenta) para consultas rápidas.
            </li>
            <li>
              <strong>Botón en cada producto:</strong> En la página de detalle
              de cada producto, puedes hacer clic en "Consultar por WhatsApp"
              para preguntar sobre ese artículo específico.
            </li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            Te ayudamos a elegir productos, resolver dudas sobre códigos,
            medidas, compatibilidad o cualquier pregunta relacionada con tu
            pedido.
          </p>
          {whatsappUrl && (
            <div className="mt-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                aria-label="Abrir chat de WhatsApp"
              >
                <span>💬 Contactar por WhatsApp</span>
              </a>
            </div>
          )}
        </section>

        {/* Puntos de lealtad */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Puntos de lealtad
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Cada compra te genera puntos que puedes usar para obtener descuentos
            en futuros pedidos.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Ganancia de puntos:</strong> Por cada ${LOYALTY_POINTS_PER_MXN} MXN pagado, recibes{" "}
              {LOYALTY_POINTS_PER_MXN} punto.
            </li>
            <li>
              <strong>Descuento con puntos:</strong> Al acumular al menos{" "}
              {LOYALTY_MIN_POINTS_FOR_DISCOUNT.toLocaleString()} puntos, puedes
              usarlos para obtener un {LOYALTY_DISCOUNT_PERCENT}% de descuento
              en un pedido.
            </li>
            <li>
              <strong>Uso de puntos:</strong> Al usar el descuento, se gastan
              exactamente {LOYALTY_MIN_POINTS_FOR_DISCOUNT.toLocaleString()}{" "}
              puntos, pero sigues ganando puntos por ese pedido (sobre el total
              pagado con descuento).
            </li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            Puedes consultar tus puntos acumulados en{" "}
            <Link
              href="/cuenta"
              className="text-primary-600 hover:underline"
            >
              tu cuenta
            </Link>{" "}
            o en la sección de{" "}
            <Link
              href="/cuenta/pedidos"
              className="text-primary-600 hover:underline"
            >
              mis pedidos
            </Link>
            .
          </p>
        </section>

        {/* Pagos */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Pagos
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Los pagos con tarjeta se procesan de forma segura a través de
            Stripe, una plataforma de pagos reconocida internacionalmente.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Actualmente, las compras con tarjeta están en modo prueba para
            validar el flujo de compra. Esto nos permite asegurar que todo
            funcione correctamente antes de procesar pedidos reales.
          </p>
        </section>

        {/* Contacto */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Contacto
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Si tienes alguna duda, pregunta o necesitas ayuda para elegir
            productos, no dudes en escribirnos por WhatsApp. Estamos aquí para
            ayudarte.
          </p>
          {whatsappUrl && (
            <div className="mt-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                aria-label="Abrir chat de WhatsApp"
              >
                <span>💬 Escribir por WhatsApp</span>
              </a>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

