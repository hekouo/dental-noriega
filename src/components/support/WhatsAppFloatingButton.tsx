import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

export function WhatsAppFloatingButton() {
  const whatsappUrl = getWhatsAppUrl("Hola, necesito ayuda para comprar en ddnshop.mx");

  // No renderizar si no hay teléfono configurado
  if (!whatsappUrl) {
    return null;
  }

  return (
    <Link
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="hidden md:flex fixed bottom-6 right-6 items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-[1.03] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 z-30"
      aria-label="Abrir chat de WhatsApp de Depósito Dental Noriega"
    >
      <MessageCircle className="w-5 h-5" aria-hidden="true" />
      <span className="font-medium">WhatsApp</span>
    </Link>
  );
}

