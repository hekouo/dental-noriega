import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle, Truck, Clock, MapPin, Shield, RotateCcw } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export const metadata: Metadata = {
  title: "Envíos | Depósito Dental Noriega",
  description: "Información sobre envíos a todo México. Tiempos de entrega, cobertura, costos y políticas de devolución.",
};

const faqs = [
  {
    question: "¿A qué ciudades envían?",
    answer: "Realizamos envíos a todo México a través de paqueterías confiables. Puedes consultar las opciones disponibles y tiempos estimados durante el proceso de checkout ingresando tu código postal y dirección.",
  },
  {
    question: "¿Cuánto tardan los envíos?",
    answer: "Los tiempos de entrega varían según tu ubicación y el método de paquetería seleccionado. Generalmente, los envíos dentro de la Ciudad de México y área metropolitana tardan entre 2-3 días hábiles, mientras que a otras ciudades del país pueden tardar entre 4-7 días hábiles. Los tiempos exactos se muestran durante el checkout antes de completar tu pedido.",
  },
  {
    question: "¿Cómo puedo rastrear mi pedido?",
    answer: "Una vez que tu pedido sea despachado, recibirás la guía de rastreo por correo electrónico y por WhatsApp. Podrás seguir tu envío en tiempo real usando el número de guía en la página web de la paquetería correspondiente.",
  },
  {
    question: "¿Hay envío gratis?",
    answer: "Sí, ofrecemos envío gratis en compras superiores a $2,000 MXN en productos (subtotal sin incluir envío). El umbral se calcula sobre el subtotal de productos antes de aplicar cualquier descuento. Puedes ver el progreso hacia el envío gratis en la página del producto y en el carrito.",
  },
  {
    question: "¿Puedo cambiar mi dirección de envío después de hacer el pedido?",
    answer: "Si tu pedido aún no ha sido despachado, puedes contactarnos por WhatsApp para solicitar el cambio de dirección. Una vez que el pedido esté en tránsito, no es posible cambiar la dirección de envío.",
  },
  {
    question: "¿Qué pasa si mi pedido no llega o está dañado?",
    answer: "Si tu pedido no llega en el tiempo estimado o llega dañado, contáctanos inmediatamente por WhatsApp con el número de pedido y una foto del producto (si aplica). Te ayudaremos a resolver el problema lo antes posible, ya sea con un reemplazo o una devolución según corresponda.",
  },
];

export default function EnviosPage() {
  const whatsappUrl = getWhatsAppUrl("Hola, tengo una consulta sobre envíos.");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Envíos a todo México
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Entregamos tus insumos dentales de forma segura y confiable
          </p>
        </div>
      </section>

      {/* Tiempos de entrega */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Tiempos de entrega
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Los tiempos de entrega varían según tu ubicación y el método de paquetería seleccionado durante el checkout.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                  <span><strong>Ciudad de México y área metropolitana:</strong> 2-3 días hábiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                  <span><strong>Otras ciudades:</strong> 4-7 días hábiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                  <span>Los tiempos exactos se muestran durante el checkout antes de completar tu pedido</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cobertura */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Cobertura nacional
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Realizamos envíos a todo México a través de paqueterías confiables. Puedes consultar las opciones disponibles y costos ingresando tu código postal y dirección durante el proceso de checkout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rastreo */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Rastreo de pedidos
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Una vez que tu pedido sea despachado, recibirás la guía de rastreo por correo electrónico y por WhatsApp. Podrás seguir tu envío en tiempo real usando el número de guía en la página web de la paquetería correspondiente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Devoluciones */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Devoluciones y garantías
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Si recibes un producto defectuoso o no corresponde a lo solicitado, contáctanos inmediatamente por WhatsApp con el número de pedido. Te ayudaremos a resolver el problema lo antes posible.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Las devoluciones están disponibles dentro de los primeros 15 días posteriores a la recepción, siempre que el producto esté en su empaque original y sin uso.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8 sm:mb-12">
            Preguntas frecuentes sobre envíos
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow duration-200"
              >
                <summary className="cursor-pointer list-none font-medium text-foreground flex items-center justify-between">
                  <span>{faq.question}</span>
                  <span className="ml-4 text-muted-foreground group-open:rotate-180 transition-transform text-lg">
                    ▾
                  </span>
                </summary>
                <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-12 sm:py-16 px-4 bg-primary-600 dark:bg-primary-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            ¿Tienes dudas sobre envíos?
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Contáctanos por WhatsApp o revisa nuestra tienda para ver opciones de envío en tiempo real
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={ROUTES.tienda()}
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
            >
              Ver tienda
            </Link>
            {whatsappUrl && (
              <Link
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600 border border-primary-400"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Hablar por WhatsApp
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
