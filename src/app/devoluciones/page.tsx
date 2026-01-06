import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle, RotateCcw, CheckCircle, XCircle, Clock, HelpCircle, ArrowRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export const metadata: Metadata = {
  title: "Devoluciones y garantías | Depósito Dental Noriega",
  description: "Política de devoluciones y garantías. Si algo llega mal, lo resolvemos rápido.",
};

const faqs = [
  {
    question: "¿Cuánto tiempo tengo para reportar?",
    answer: "Tienes 15 días hábiles desde la recepción de tu pedido para reportar cualquier problema. Es importante contactarnos lo antes posible para agilizar la resolución.",
  },
  {
    question: "¿Qué evidencia debo enviar?",
    answer: "Necesitamos fotos claras del producto defectuoso o que no corresponde, el empaque (si aplica), y el número de pedido. Si el producto llegó incompleto, incluye fotos de lo que recibiste y la lista de empaque si está disponible.",
  },
  {
    question: "¿Qué pasa si llegó incompleto?",
    answer: "Si tu pedido llegó incompleto, contáctanos inmediatamente por WhatsApp con el número de pedido y fotos de lo que recibiste. Enviaremos los productos faltantes sin costo adicional o procesaremos un reembolso parcial según corresponda.",
  },
  {
    question: "¿Puedo cambiar por otro producto?",
    answer: "Sí, si el producto que recibiste no es el que solicitaste o tiene un defecto, podemos cambiarlo por otro producto de igual o mayor valor. Si el nuevo producto tiene un costo mayor, deberás cubrir la diferencia. Si es menor, te reembolsaremos la diferencia.",
  },
  {
    question: "¿Cómo se hace el reembolso (si aplica)?",
    answer: "Los reembolsos se procesan al método de pago original utilizado en la compra. El tiempo de acreditación depende de tu banco o institución financiera, generalmente entre 3-10 días hábiles después de aprobar la devolución.",
  },
  {
    question: "¿Qué pasa con el envío en devoluciones?",
    answer: "Si la devolución es por error nuestro (producto defectuoso, incorrecto o incompleto), cubrimos el costo del envío de retorno. Si la devolución es por cambio de opinión o error del cliente, el costo del envío de retorno corre por cuenta del cliente.",
  },
];

export default function DevolucionesPage() {
  const whatsappUrl = getWhatsAppUrl("Hola, necesito ayuda con una devolución o garantía.");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Devoluciones y garantías
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Si algo llega mal, lo resolvemos rápido.
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

      {/* Cuándo aplica */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Cuándo aplica
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Aceptamos devoluciones y garantías en los siguientes casos:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                  <span><strong>Producto dañado:</strong> Si el producto llegó con defectos de fabricación o daños durante el transporte</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                  <span><strong>Error en envío:</strong> Si recibiste un producto diferente al que solicitaste</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                  <span><strong>Faltantes:</strong> Si tu pedido llegó incompleto o faltan productos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                  <span><strong>Producto no conforme:</strong> Si el producto no cumple con las especificaciones descritas</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cuándo no aplica */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Cuándo no aplica
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Las devoluciones no aplican en los siguientes casos:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 mt-1">•</span>
                  <span><strong>Uso o consumo:</strong> Productos que han sido abiertos, usados o consumidos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 mt-1">•</span>
                  <span><strong>Empaque abierto en consumibles:</strong> Productos consumibles cuyo empaque ha sido abierto o alterado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 mt-1">•</span>
                  <span><strong>Productos bajo pedido especial:</strong> Artículos personalizados o fabricados bajo pedido específico (salvo defectos de fabricación)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 mt-1">•</span>
                  <span><strong>Fuera del plazo:</strong> Solicitudes realizadas después de 15 días hábiles desde la recepción</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo solicitar */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Cómo solicitar
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Sigue estos pasos para solicitar una devolución o garantía:
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Envía un mensaje</h3>
                    <p className="text-sm text-muted-foreground">
                      Contáctanos por WhatsApp con tu número de pedido y una descripción del problema. Incluye fotos si es posible.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Proporciona evidencia</h3>
                    <p className="text-sm text-muted-foreground">
                      Envía fotos claras del producto, empaque y cualquier documentación relevante. Esto nos ayuda a evaluar tu caso rápidamente.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Recibe la solución</h3>
                    <p className="text-sm text-muted-foreground">
                      Te proporcionaremos la solución más adecuada: reemplazo, cambio por otro producto, o reembolso según corresponda.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tiempos de respuesta */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Tiempos de respuesta
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Respondemos a todas las solicitudes de devolución y garantía en un plazo de 24-48 horas hábiles. Una vez aprobada tu solicitud, procesaremos el reemplazo, cambio o reembolso lo antes posible. Los tiempos de reembolso dependen de tu banco o institución financiera, generalmente entre 3-10 días hábiles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8 sm:mb-12">
            Preguntas frecuentes sobre devoluciones
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
            ¿Necesitas ayuda con una devolución?
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Contáctanos por WhatsApp y te ayudaremos a resolver tu caso rápidamente
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
            <Link
              href="/envios"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600 border border-primary-400"
            >
              Ver envíos
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
