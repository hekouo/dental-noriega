import Link from "next/link";
import { MessageCircle, HelpCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

type HelpWidgetContext = "home" | "shop" | "pdp" | "checkout";

type HelpWidgetProps = {
  context: HelpWidgetContext;
  productTitle?: string;
  productSlug?: string;
  compact?: boolean;
};

const contextMessages: Record<HelpWidgetContext, string> = {
  home: "Hola, necesito ayuda para comprar en ddnshop.mx",
  shop: "Hola, necesito ayuda para comprar en ddnshop.mx",
  pdp: "Hola, tengo duda sobre: {productTitle}",
  checkout: "Hola, necesito ayuda para finalizar mi compra",
};

const contextTexts: Record<HelpWidgetContext, string> = {
  home: "Te ayudamos a elegir y cotizar.",
  shop: "Te ayudamos a elegir y cotizar.",
  pdp: "¿Dudas sobre este producto? Te asesoramos.",
  checkout: "Si tienes problemas para finalizar tu compra, te ayudamos.",
};

export function HelpWidget({
  context,
  productTitle,
  compact = false,
}: HelpWidgetProps) {
  let whatsappMessage = contextMessages[context];
  if (context === "pdp" && productTitle) {
    whatsappMessage = whatsappMessage.replace("{productTitle}", productTitle);
  }

  const whatsappUrl = getWhatsAppUrl(whatsappMessage);
  const helpText = contextTexts[context];

  return (
    <div
      className={`bg-card border border-border rounded-2xl shadow-sm p-4 sm:p-6 ${
        compact ? "text-sm" : ""
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <HelpCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">
            ¿Necesitas ayuda?
          </h3>
          <p className="text-sm text-muted-foreground">{helpText}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {whatsappUrl && (
          <Link
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 min-h-[44px]"
            aria-label="Contactar por WhatsApp para recibir ayuda"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </Link>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground mb-2">Enlaces rápidos:</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/como-comprar"
            className="px-3 py-1.5 text-xs bg-muted hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-border rounded-lg text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Cómo comprar
          </Link>
          <Link
            href="/envios"
            className="px-3 py-1.5 text-xs bg-muted hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-border rounded-lg text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Envíos
          </Link>
          <Link
            href="/facturacion"
            className="px-3 py-1.5 text-xs bg-muted hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-border rounded-lg text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Facturación
          </Link>
          <Link
            href="/contacto"
            className="px-3 py-1.5 text-xs bg-muted hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-border rounded-lg text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Contacto
          </Link>
        </div>
      </div>
    </div>
  );
}

