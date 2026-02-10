import Link from "next/link";
import { Truck, CreditCard, MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export function TopInfoBar() {
  const whatsappUrl = getWhatsAppUrl("Hola, tengo una consulta.");

  return (
    <div className="bg-card border-b border-border text-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-2">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-muted-foreground leading-snug">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 min-h-[44px] sm:min-h-0">
              <Truck className="w-4 h-4 flex-shrink-0" aria-hidden />
              <span>Envíos a todo México</span>
              <Link
                href="/envios"
                className="text-foreground hover:text-primary-600 dark:hover:text-primary-400 underline underline-offset-2 transition-colors focus-premium min-h-[44px] inline-flex items-center sm:min-h-0"
              >
                Ver envíos
              </Link>
            </div>
            <span className="hidden sm:inline text-border" aria-hidden>|</span>
            <div className="flex items-center gap-2 min-h-[44px] sm:min-h-0">
              <CreditCard className="w-4 h-4 flex-shrink-0" aria-hidden />
              <span>Tarjeta o transferencia</span>
            </div>
            <span className="hidden sm:inline text-border" aria-hidden>|</span>
            {whatsappUrl && (
              <div className="flex items-center gap-2 min-h-[44px] sm:min-h-0">
                <MessageCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
                <Link
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary-600 dark:hover:text-primary-400 underline underline-offset-2 transition-colors focus-premium inline-flex items-center"
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

