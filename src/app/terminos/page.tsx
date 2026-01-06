import Link from "next/link";
import type { Metadata } from "next";
import { FileText, DollarSign, CreditCard, Truck, RotateCcw, MessageCircle, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Términos y condiciones | Depósito Dental Noriega",
  description: "Términos y condiciones de uso del sitio web y compra de productos.",
};

export default function TerminosPage() {
  const lastUpdated = "Enero 2025";

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Términos y condiciones
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Condiciones de uso del sitio web y compra de productos
          </p>
        </div>
      </section>

      {/* Uso del sitio */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Uso del sitio
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Al acceder y utilizar este sitio web, aceptas cumplir con estos términos y condiciones. El sitio es operado por Depósito Dental Noriega y tiene como objeto la comercialización de insumos y equipos dentales.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Te comprometes a utilizar el sitio de manera legal y responsable, sin realizar actividades que puedan dañar, deshabilitar o sobrecargar el sitio o interferir con el uso de otros usuarios.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Precios e inventario */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Precios e inventario
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Todos los precios están expresados en pesos mexicanos (MXN) e incluyen IVA cuando aplica. Los precios y la disponibilidad de productos pueden cambiar sin previo aviso.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Nos reservamos el derecho de corregir errores en precios o disponibilidad. Si detectamos un error después de que hayas realizado un pedido, te notificaremos y te ofreceremos la opción de:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                    <span>Confirmar tu pedido al precio correcto</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                    <span>Cancelar tu pedido sin costo alguno</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pedidos y pagos */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Pedidos y pagos
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Al realizar un pedido, realizas una oferta de compra. Nos reservamos el derecho de aceptar o rechazar cualquier pedido. Una vez que aceptamos tu pedido y se confirma el pago, recibirás una confirmación por correo electrónico.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Aceptamos los siguientes métodos de pago:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                    <span><strong>Tarjeta de crédito o débito:</strong> Procesadas de forma segura a través de Stripe</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600 dark:text-primary-400 mt-1">•</span>
                    <span><strong>Transferencia bancaria:</strong> Para pedidos mayores, puedes solicitar los datos bancarios</span>
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Puedes cancelar tu pedido antes de que sea procesado contactándonos por WhatsApp o a través de nuestra página de <Link href="/contacto" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">contacto</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Envíos */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Envíos
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Coordinamos el envío de tu pedido una vez confirmado el pago. Los tiempos y costos de envío se informan durante el proceso de compra antes de finalizar tu pedido.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Realizamos envíos a todo México a través de paqueterías confiables. Una vez despachado tu pedido, recibirás la guía de rastreo por correo electrónico y por WhatsApp.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Para más información sobre envíos, consulta nuestra página de <Link href="/envios" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">envíos</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Devoluciones y garantías */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Devoluciones y garantías
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Todos los productos son nuevos y provienen directamente de fabricantes o distribuidores autorizados. Si recibes un producto defectuoso, incorrecto o incompleto, contáctanos inmediatamente.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Aceptamos devoluciones dentro de los primeros 15 días posteriores a la recepción, siempre que el producto esté en su empaque original y sin uso. Los costos de envío de devoluciones corren por cuenta del cliente, salvo que el producto sea defectuoso o no corresponda al pedido realizado.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Para más información sobre nuestra política de devoluciones, consulta nuestra página de <Link href="/devoluciones" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">devoluciones y garantías</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Contacto
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Si tienes preguntas sobre estos términos y condiciones, o sobre cualquier aspecto de nuestros productos o servicios, contáctanos a través de nuestra página de <Link href="/contacto" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">contacto</Link> o por WhatsApp.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Estamos disponibles de lunes a viernes de 9:00 a 18:00 horas para atenderte.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Última actualización */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            Última actualización: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Links útiles */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8">
            Links útiles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/como-comprar"
              className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200 flex items-center justify-between group"
            >
              <span className="text-foreground font-medium">Cómo comprar</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            </Link>
            <Link
              href="/envios"
              className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200 flex items-center justify-between group"
            >
              <span className="text-foreground font-medium">Envíos</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            </Link>
            <Link
              href="/devoluciones"
              className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200 flex items-center justify-between group"
            >
              <span className="text-foreground font-medium">Devoluciones</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            </Link>
            <Link
              href="/facturacion"
              className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200 flex items-center justify-between group"
            >
              <span className="text-foreground font-medium">Facturación</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            </Link>
            <Link
              href="/contacto"
              className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200 flex items-center justify-between group sm:col-span-2"
            >
              <span className="text-foreground font-medium">Contacto</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

