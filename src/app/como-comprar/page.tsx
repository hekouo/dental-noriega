import Link from "next/link";
import type { Metadata } from "next";
import { ShoppingCart, Search, User, CreditCard, MessageCircle, ChevronRight, Truck, Shield, ReceiptText } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export const metadata: Metadata = {
  title: "Cómo comprar | Depósito Dental Noriega",
  description: "Compra insumos dentales en 3 minutos. Envíos a todo México. Atención por WhatsApp.",
};

const faqs = [
  {
    question: "¿Cuánto tardan los envíos?",
    answer: "Los envíos a todo México tienen tiempos de entrega de 3-7 días hábiles, dependiendo de tu ubicación. Puedes consultar los tiempos exactos en el proceso de checkout antes de completar tu compra.",
  },
  {
    question: "¿Hacen factura?",
    answer: "Sí, ofrecemos facturación para todas tus compras. Puedes solicitarla al finalizar tu pedido. Genera tu factura fácilmente desde tu cuenta.",
  },
  {
    question: "¿Puedo pagar por transferencia?",
    answer: "Sí, aceptamos pagos con tarjeta de crédito/débito (Visa, Mastercard, American Express) mediante Stripe, y también puedes pagar con transferencia bancaria o depósito en OXXO.",
  },
  {
    question: "¿Cómo envío mi comprobante de pago?",
    answer: "Después de realizar tu pago por transferencia o depósito, recibirás instrucciones por email sobre cómo enviar tu comprobante. También puedes subirlo directamente en la página de confirmación de tu pedido.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer: "Aceptamos pagos con tarjeta de crédito y débito (Visa, Mastercard, American Express) a través de Stripe, transferencias bancarias y depósitos en OXXO. Todos los pagos con tarjeta se procesan de forma segura.",
  },
  {
    question: "¿Cómo pedir ayuda por WhatsApp?",
    answer: "Puedes contactarnos por WhatsApp de dos formas: usando el botón flotante visible en todas las páginas (excepto checkout) o haciendo clic en 'Consultar por WhatsApp' en la página de cualquier producto. Resolvemos tus dudas rápidamente, normalmente en minutos.",
  },
];

const trustFeatures = [
  {
    title: "Envíos a todo México",
    description: "Trabajamos con paqueterías confiables y te compartimos tu guía de seguimiento.",
  },
  {
    title: "Pago seguro",
    description: "Procesamos pagos con Stripe. Tus datos están protegidos.",
  },
  {
    title: "Facturación disponible",
    description: "Emitimos facturas electrónicas para tu contabilidad.",
  },
  {
    title: "Atención rápida",
    description: "Resolvemos dudas por WhatsApp en minutos, no horas.",
  },
];

export default function ComoComprarPage() {
  const whatsappUrl = getWhatsAppUrl("Hola, tengo una consulta sobre cómo comprar.");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero compacto */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Compra en 3 minutos
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Envíos a todo México. Atención por WhatsApp.
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
                WhatsApp
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stepper 4 pasos */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8 sm:mb-12">
            Proceso de compra simple
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Paso 1 */}
            <div className="relative bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="mb-4 text-primary-600 dark:text-primary-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Explora productos
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Navega por categorías o usa el buscador para encontrar lo que necesitas
              </p>
            </div>

            {/* Paso 2 */}
            <div className="relative bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="mb-4 text-primary-600 dark:text-primary-400">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Agrega al carrito
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Selecciona la cantidad y agrega los productos a tu carrito de compra
              </p>
            </div>

            {/* Paso 3 */}
            <div className="relative bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="mb-4 text-primary-600 dark:text-primary-400">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Completa tus datos
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ingresa tu información de envío y elige el método de paquetería
              </p>
            </div>

            {/* Paso 4 */}
            <div className="relative bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div className="mb-4 text-primary-600 dark:text-primary-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Paga
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pago seguro con tarjeta o transferencia bancaria
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section (Server-safe) */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-md transition-shadow duration-200">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full mb-4 mx-auto">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm">
                {trustFeatures[0].title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {trustFeatures[0].description}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-md transition-shadow duration-200">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full mb-4 mx-auto">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm">
                {trustFeatures[1].title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {trustFeatures[1].description}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-md transition-shadow duration-200">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full mb-4 mx-auto">
                <ReceiptText className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm">
                {trustFeatures[2].title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {trustFeatures[2].description}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-md transition-shadow duration-200">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full mb-4 mx-auto">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm">
                {trustFeatures[3].title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {trustFeatures[3].description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ con details/summary */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8 sm:mb-12">
            Preguntas frecuentes
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
            ¿Listo para empezar?
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Explora nuestra tienda o contáctanos directamente por WhatsApp para resolver cualquier duda
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={ROUTES.tienda()}
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
            >
              Ver tienda
              <ChevronRight className="w-5 h-5 ml-2" />
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
