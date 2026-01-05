import Link from "next/link";
import { Truck, CreditCard, MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export function TopInfoBar() {
  const whatsappUrl = getWhatsAppUrl("Hola, tengo una consulta.");

  return (
    <div className="bg-muted/50 dark:bg-muted/30 border-b border-border">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-2 text-xs sm:text-sm text-muted-foreground">
          {/* Envíos */}
          <Link
            href="/envios"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Envíos a todo México</span>
          </Link>

          {/* Separador */}
          <span className="hidden sm:inline text-border" aria-hidden="true">
            |
          </span>

          {/* Métodos de pago */}
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Tarjeta o transferencia</span>
          </div>

          {/* Separador */}
          <span className="hidden sm:inline text-border" aria-hidden="true">
            |
          </span>

          {/* Soporte WhatsApp */}
          {whatsappUrl ? (
            <Link
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Soporte WhatsApp</span>
            </Link>
          ) : (
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Soporte WhatsApp</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

