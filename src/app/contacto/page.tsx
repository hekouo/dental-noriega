import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle, Clock, HelpCircle, FileText, ChevronRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contacto | Depósito Dental Noriega",
  description: "Contáctanos por WhatsApp para cotizar productos, resolver dudas o recibir asesoría personalizada en insumos dentales.",
};

export default function ContactoPage() {
  const whatsappUrl = getWhatsAppUrl("Hola, me gustaría recibir información sobre productos dentales.");
  const whatsappCotizacionUrl = getWhatsAppUrl("Hola, necesito una cotización de productos dentales.");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Contáctanos
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Te ayudamos a cotizar y elegir productos dentales de calidad para tu consultorio o clínica.
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
                WhatsApp
              </Link>
            )}
            <Link
              href={ROUTES.tienda()}
              className="inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600 border border-primary-400"
            >
              Ver tienda
              <ChevronRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Secciones de información */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 space-y-12">
        {/* Atención por WhatsApp */}
        <section>
          <div className="flex items-start gap-4 bg-card border border-border rounded-xl p-6 shadow-sm">
            <MessageCircle className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Atención por WhatsApp
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Nuestro equipo está disponible para responder tus consultas, ayudarte a encontrar productos específicos y brindarte cotizaciones personalizadas.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Tiempo de respuesta:</strong> Generalmente respondemos en menos de 2 horas durante horario de atención.
              </p>
            </div>
          </div>
        </section>

        {/* Horarios */}
        <section>
          <div className="flex items-start gap-4 bg-card border border-border rounded-xl p-6 shadow-sm">
            <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Horarios de Atención
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                <strong className="text-foreground">Lunes a Viernes:</strong> 9:00 a 18:00 hrs.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Sábados y Domingos:</strong> Cerrado
              </p>
            </div>
          </div>
        </section>

        {/* Ayuda rápida */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Ayuda Rápida</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/como-comprar"
              className="flex items-start gap-4 bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary-500 dark:hover:border-primary-400 transition-colors group"
            >
              <HelpCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  Cómo comprar
                </h3>
                <p className="text-xs text-muted-foreground">
                  Guía paso a paso para realizar tu pedido
                </p>
              </div>
            </Link>
            <Link
              href="/envios"
              className="flex items-start gap-4 bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary-500 dark:hover:border-primary-400 transition-colors group"
            >
              <MessageCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  Envíos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Información sobre tiempos y costos de envío
                </p>
              </div>
            </Link>
            <Link
              href="/facturacion"
              className="flex items-start gap-4 bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary-500 dark:hover:border-primary-400 transition-colors group"
            >
              <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  Facturación
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cómo solicitar tu factura electrónica
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Qué incluir en tu mensaje */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
            Qué incluir en tu mensaje
          </h2>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <p className="text-sm text-muted-foreground mb-4">
              Para darte una respuesta más rápida y precisa, incluye:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 font-bold mt-0.5">•</span>
                <span><strong className="text-foreground">Producto:</strong> Nombre o descripción del producto que necesitas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 font-bold mt-0.5">•</span>
                <span><strong className="text-foreground">Cantidad:</strong> Cuántas unidades o paquetes requieres</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 font-bold mt-0.5">•</span>
                <span><strong className="text-foreground">Ciudad/Código Postal:</strong> Para calcular envío y disponibilidad</span>
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* CTA final */}
      <section className="py-12 sm:py-16 px-4 bg-primary-600 dark:bg-primary-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            ¿Listo para hacer tu pedido?
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Contáctanos por WhatsApp y te ayudamos a encontrar los productos que necesitas.
          </p>
          {whatsappCotizacionUrl && (
            <Link
              href={whatsappCotizacionUrl}
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

