import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle, FileText, Clock, CheckCircle, HelpCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export const metadata: Metadata = {
  title: "Facturación | Depósito Dental Noriega",
  description: "Información sobre facturación electrónica. Cómo solicitar tu factura, datos necesarios y tiempos de emisión.",
};

const faqs = [
  {
    question: "¿Hacen facturas?",
    answer: "Sí, ofrecemos facturación electrónica para todas tus compras. Puedes solicitarla al finalizar tu pedido durante el proceso de checkout o contactarnos después de realizar tu compra.",
  },
  {
    question: "¿Qué datos necesito para la factura?",
    answer: "Para emitir tu factura necesitamos: razón social, RFC, dirección fiscal completa (calle, número, colonia, código postal, ciudad, estado) y método de contacto (email o teléfono). Puedes proporcionar estos datos durante el checkout o enviarlos por WhatsApp después de tu compra.",
  },
  {
    question: "¿Cuánto tiempo tarda en emitirse la factura?",
    answer: "Una vez que proporciones los datos fiscales correctos y se confirme el pago de tu pedido, la factura se emite generalmente en 1-3 días hábiles. Recibirás tu factura por correo electrónico en formato PDF.",
  },
  {
    question: "¿Puedo solicitar la factura después de hacer la compra?",
    answer: "Sí, puedes solicitar tu factura después de realizar la compra. Contáctanos por WhatsApp con tu número de pedido y los datos fiscales necesarios. Te ayudaremos a generar la factura de tu pedido.",
  },
  {
    question: "¿Qué tipo de facturas emiten?",
    answer: "Emitimos facturas electrónicas (CFDI) conforme a las normas fiscales mexicanas. Todas nuestras facturas son válidas para efectos fiscales y contables.",
  },
  {
    question: "¿Puedo cancelar o corregir una factura?",
    answer: "Si necesitas cancelar o corregir una factura, contáctanos por WhatsApp con el número de pedido y el motivo. Te ayudaremos a resolver la situación según los procedimientos fiscales correspondientes.",
  },
];

export default function FacturacionPage() {
  const whatsappUrl = getWhatsAppUrl("Hola, tengo una consulta sobre facturación.");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Facturación electrónica
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Emitimos facturas electrónicas válidas para tu contabilidad
          </p>
        </div>
      </section>

      {/* Cómo solicitar */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Cómo solicitar tu factura
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Puedes solicitar tu factura de dos formas:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Durante el checkout:</strong> Al finalizar tu pedido, puedes indicar que necesitas factura y proporcionar los datos fiscales necesarios.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Después de la compra:</strong> Si ya realizaste tu pedido, contáctanos por WhatsApp con tu número de pedido y los datos fiscales para generar la factura.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Datos necesarios */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Datos necesarios
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Para emitir tu factura electrónica necesitamos la siguiente información:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                  <span><strong>Razón social:</strong> Nombre completo de tu empresa o persona física</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                  <span><strong>RFC:</strong> Registro Federal de Contribuyentes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                  <span><strong>Dirección fiscal:</strong> Calle, número, colonia, código postal, ciudad y estado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                  <span><strong>Método de contacto:</strong> Email o teléfono para enviar la factura</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Tiempos */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Tiempos de emisión
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Una vez que proporciones los datos fiscales correctos y se confirme el pago de tu pedido, la factura se emite generalmente en 1-3 días hábiles. Recibirás tu factura por correo electrónico en formato PDF. Si necesitas la factura con mayor urgencia, contáctanos por WhatsApp y haremos lo posible por acelerar el proceso.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8 sm:mb-12">
            Preguntas frecuentes sobre facturación
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
            ¿Necesitas ayuda con tu factura?
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Contáctanos por WhatsApp y te ayudaremos a generar tu factura o resolver cualquier duda
          </p>
          {whatsappUrl && (
            <Link
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Hablar por WhatsApp
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

