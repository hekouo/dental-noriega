import Link from "next/link";
import { MessageCircle, CreditCard, Building2 } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export function Footer() {
  const whatsappUrl = getWhatsAppUrl("Hola, tengo una consulta.");

  return (
    <footer className="bg-stone-50/80 dark:bg-gray-900/50 border-t border-stone-200 dark:border-gray-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 mb-8">
          {/* Links principales */}
          <div className="border-b border-stone-200/80 dark:border-gray-700 sm:border-b-0 pb-6 sm:pb-0">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-4 tracking-tight">
              Navegación
            </h3>
            <nav className="flex flex-col gap-1">
              <Link
                href={ROUTES.tienda()}
                className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors py-2 min-h-[44px] sm:min-h-0 sm:py-0 flex items-center focus-premium rounded"
              >
                Tienda
              </Link>
              <Link
                href={ROUTES.destacados()}
                className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors py-2 min-h-[44px] sm:min-h-0 sm:py-0 flex items-center focus-premium rounded"
              >
                Productos destacados
              </Link>
              <Link
                href="/como-comprar"
                className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors py-2 min-h-[44px] sm:min-h-0 sm:py-0 flex items-center focus-premium rounded"
              >
                Cómo comprar
              </Link>
              <Link
                href="/envios"
                className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors py-2 min-h-[44px] sm:min-h-0 sm:py-0 flex items-center focus-premium rounded"
              >
                Envíos
              </Link>
              <Link
                href="/facturacion"
                className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors py-2 min-h-[44px] sm:min-h-0 sm:py-0 flex items-center focus-premium rounded"
              >
                Facturación
              </Link>
              <Link
                href="/devoluciones"
                className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors py-2 min-h-[44px] sm:min-h-0 sm:py-0 flex items-center focus-premium rounded"
              >
                Devoluciones
              </Link>
              <Link
                href="/contacto"
                className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors py-2 min-h-[44px] sm:min-h-0 sm:py-0 flex items-center focus-premium rounded"
              >
                Contacto
              </Link>
            </nav>
          </div>

          {/* Métodos de pago y atención */}
          <div className="border-b border-stone-200/80 dark:border-gray-700 sm:border-b-0 pb-6 sm:pb-0">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-4 tracking-tight">
              Métodos de pago
            </h3>
            <div className="flex flex-col gap-2 text-sm text-stone-600 dark:text-stone-400">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 flex-shrink-0" aria-hidden />
                <span>Tarjeta de crédito/débito</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 flex-shrink-0" aria-hidden />
                <span>Transferencia bancaria</span>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-4 mt-6 tracking-tight">
              Atención
            </h3>
            {whatsappUrl && (
              <Link
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors py-2 min-h-[44px] sm:min-h-0 sm:py-0 focus-premium rounded"
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
                <span>WhatsApp</span>
              </Link>
            )}
            <p className="text-xs text-stone-500 dark:text-stone-500 mt-2">
              Lunes a Viernes 9:00 - 18:00 hrs
            </p>
          </div>

          {/* Información adicional y Legal */}
          <div>
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-4 tracking-tight">
              Depósito Dental Noriega
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
              Insumos dentales de calidad para consultorios, clínicas y ortodoncistas en México.
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-500 mb-6">
              Envíos a todo el país. Atención personalizada.
            </p>

            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-4 tracking-tight">
              Legal
            </h3>
            <nav className="flex flex-col gap-1">
              <Link
                href="/privacidad"
                className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors py-2 min-h-[44px] sm:min-h-0 sm:py-0 flex items-center focus-premium rounded"
              >
                Aviso de privacidad
              </Link>
              <Link
                href="/terminos"
                className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors py-2 min-h-[44px] sm:min-h-0 sm:py-0 flex items-center focus-premium rounded"
              >
                Términos y condiciones
              </Link>
            </nav>
          </div>
        </div>

        {/* Línea legal */}
        <div className="border-t border-stone-200/80 dark:border-gray-700 pt-6 mt-6">
          <p className="text-xs text-stone-500 dark:text-stone-500 text-center">
            © {new Date().getFullYear()} Depósito Dental Noriega. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

