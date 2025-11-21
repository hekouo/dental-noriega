import Link from "next/link";
import type { Metadata } from "next";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import { FREE_SHIPPING_THRESHOLD_MXN } from "@/lib/shipping/freeShipping";
import {
  LOYALTY_POINTS_PER_MXN,
  LOYALTY_MIN_POINTS_FOR_DISCOUNT,
  LOYALTY_DISCOUNT_PERCENT,
} from "@/lib/loyalty/config";

export const metadata: Metadata = {
  title: "Cómo comprar | Depósito Dental Noriega",
  description:
    "Guía rápida para comprar insumos dentales en Depósito Dental Noriega. Envíos a todo México, envío gratis desde $2,000 MXN, puntos de lealtad y atención por WhatsApp.",
  openGraph: {
    title: "Cómo comprar | Depósito Dental Noriega",
    description:
      "Guía rápida para comprar insumos dentales. Envíos a todo México, envío gratis desde $2,000 MXN, puntos de lealtad y atención por WhatsApp.",
    type: "website",
  },
};

export default function ComoComprarPage() {
  const whatsappUrl = getWhatsAppUrl();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
          Insumos dentales para consultorios y clínicas en México
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Guía rápida para comprar en Depósito Dental Noriega
        </p>

        <div className="space-y-8">
          {/* Quiénes somos */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Quiénes somos
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                Depósito Dental Noriega es una tienda familiar de insumos dentales
                en México. Nos especializamos en brindar productos de calidad para
                consultorios, clínicas y ortodoncistas.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Ofrecemos atención directa y personalizada por WhatsApp para ayudarte
                a elegir los productos correctos según tu práctica y presupuesto.
              </p>
            </div>
          </section>

          {/* Cómo comprar */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Cómo comprar
            </h2>
            <div className="prose prose-gray max-w-none">
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
                  </Link>
                  , o busca por{" "}
                  <Link
                    href={ROUTES.buscar()}
                    className="text-primary-600 hover:underline"
                  >
                    nombre o categoría
                  </Link>
                  .
                </li>
                <li>
                  <strong>Agrega al carrito:</strong> Haz clic en "Agregar al carrito"
                  o usa "Comprar ahora" para ir directo al checkout.
                </li>
                <li>
                  <strong>Completa tu pedido:</strong> En el checkout, llena tus datos
                  de envío y contacto. Puedes usar una dirección guardada o ingresar
                  una nueva.
                </li>
                <li>
                  <strong>Confirma y paga:</strong> Revisa tu pedido, aplica puntos de
                  lealtad si tienes suficientes, y completa el pago de forma segura.
                </li>
              </ol>
            </div>
          </section>

          {/* Envíos y envío gratis */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Envíos y envío gratis
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                Realizamos envíos a todo México mediante servicio estándar o express,
                según tu preferencia.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
                <p className="text-gray-800 font-medium mb-2">
                  🚚 Envío gratis desde ${FREE_SHIPPING_THRESHOLD_MXN.toLocaleString()} MXN
                </p>
                <p className="text-gray-700 text-sm">
                  En pedidos desde ${FREE_SHIPPING_THRESHOLD_MXN.toLocaleString()} MXN en productos
                  (subtotal antes de envío), el envío es completamente gratis.
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Una vez que tu pedido sea enviado, recibirás la guía de rastreo por
                WhatsApp o correo electrónico para que puedas seguir tu paquete en
                tiempo real.
              </p>
            </div>
          </section>

          {/* Atención por WhatsApp */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Atención por WhatsApp
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                Estamos aquí para ayudarte antes, durante y después de tu compra.
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  Encuentra el botón flotante de WhatsApp en la esquina inferior
                  derecha de la mayoría de las páginas.
                </li>
                <li>
                  Cada producto tiene un botón "Consultar por WhatsApp" para dudas
                  específicas.
                </li>
                <li>
                  Puedes pedir ayuda para elegir productos, resolver dudas sobre
                  códigos, medidas, compatibilidad o cualquier pregunta sobre tu
                  pedido.
                </li>
              </ul>
              {whatsappUrl && (
                <div className="mt-4">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                    aria-label="Abrir chat de WhatsApp"
                  >
                    💬 Abrir WhatsApp
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Puntos de lealtad */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Puntos de lealtad
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                Cada compra te acerca a beneficios exclusivos:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  <strong>Gana puntos:</strong> Por cada ${LOYALTY_POINTS_PER_MXN} MXN
                  pagado, recibes {LOYALTY_POINTS_PER_MXN} punto de lealtad.
                </li>
                <li>
                  <strong>Usa tu descuento:</strong> Al acumular al menos{" "}
                  {LOYALTY_MIN_POINTS_FOR_DISCOUNT.toLocaleString()} puntos, puedes
                  canjearlos por un {LOYALTY_DISCOUNT_PERCENT}% de descuento en tu
                  siguiente pedido.
                </li>
                <li>
                  <strong>Consulta tus puntos:</strong> Ve a{" "}
                  <Link
                    href={ROUTES.cuenta()}
                    className="text-primary-600 hover:underline"
                  >
                    tu cuenta
                  </Link>{" "}
                  o{" "}
                  <Link
                    href="/cuenta/pedidos"
                    className="text-primary-600 hover:underline"
                  >
                    mis pedidos
                  </Link>{" "}
                  para ver tu balance actual y puntos acumulados.
                </li>
              </ul>
            </div>
          </section>

          {/* Pagos */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Pagos
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                Los pagos con tarjeta se procesan de forma segura mediante Stripe,
                cumpliendo con los estándares de seguridad más altos para proteger
                tu información.
              </p>
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes("test") ||
              process.env.NODE_ENV !== "production" ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
                  <p className="text-gray-800 text-sm">
                    <strong>Nota:</strong> Actualmente el sitio está en modo de
                    prueba. Las compras con tarjeta son simuladas para validar el
                    flujo de compra. No se procesarán cargos reales.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {/* Contacto */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Contacto
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed mb-4">
                ¿Tienes preguntas o necesitas ayuda? Estamos aquí para ti.
              </p>
              {whatsappUrl && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                    aria-label="Contactar por WhatsApp"
                  >
                    💬 Escribir por WhatsApp
                  </a>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* CTA final */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center">
            <p className="text-gray-700 mb-4">
              ¿Listo para hacer tu pedido?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={ROUTES.tienda()}
                className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Ver tienda
              </Link>
              <Link
                href={ROUTES.destacados()}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Ver destacados
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

