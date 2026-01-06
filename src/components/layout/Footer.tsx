import Link from "next/link";
import { MessageCircle, CreditCard, Building2 } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export function Footer() {
  const whatsappUrl = getWhatsAppUrl("Hola, tengo una consulta.");

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Links principales */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Navegación</h3>
            <nav className="flex flex-col space-y-2">
              <Link
                href={ROUTES.tienda()}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Tienda
              </Link>
              <Link
                href={ROUTES.destacados()}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Productos destacados
              </Link>
              <Link
                href="/como-comprar"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cómo comprar
              </Link>
              <Link
                href="/envios"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Envíos
              </Link>
              <Link
                href="/facturacion"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Facturación
              </Link>
              <Link
                href="/devoluciones"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Devoluciones
              </Link>
              <Link
                href="/contacto"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contacto
              </Link>
            </nav>
          </div>

          {/* Métodos de pago y atención */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Métodos de pago</h3>
            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>Tarjeta de crédito/débito</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Transferencia bancaria</span>
              </div>
            </div>

            <h3 className="font-semibold text-foreground mb-4 mt-6">Atención</h3>
            {whatsappUrl && (
              <Link
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </Link>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Lunes a Viernes 9:00 - 18:00 hrs
            </p>
          </div>

          {/* Información adicional y Legal */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Depósito Dental Noriega</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Insumos dentales de calidad para consultorios, clínicas y ortodoncistas en México.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Envíos a todo el país. Atención personalizada.
            </p>

            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <nav className="flex flex-col space-y-2">
              <Link
                href="/privacidad"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Aviso de privacidad
              </Link>
              <Link
                href="/terminos"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Términos y condiciones
              </Link>
            </nav>
          </div>
        </div>

        {/* Línea legal */}
        <div className="border-t border-border pt-6 mt-6">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Depósito Dental Noriega. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

