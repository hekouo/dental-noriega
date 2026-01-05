import Link from "next/link";
import { Truck, CreditCard, MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export function TopInfoBar() {
  const whatsappUrl = getWhatsAppUrl("Hola, tengo una consulta.");

  return (
    <div className="bg-card border-b border-border text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-muted-foreground">
          {/* Mobile: Stack en 2 líneas */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              <span>Envíos a todo México</span>
              <Link
                href="/envios"
                className="text-foreground hover:text-primary-600 dark:hover:text-primary-400 underline underline-offset-2 transition-colors ml-1"
              >
                Ver envíos
              </Link>
            </div>
            <span className="hidden sm:inline text-border">|</span>
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Tarjeta o transferencia</span>
            </div>
            <span className="hidden sm:inline text-border">|</span>
            {whatsappUrl && (
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                <Link
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary-600 dark:hover:text-primary-400 underline underline-offset-2 transition-colors"
                >
                  Soporte WhatsApp
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

