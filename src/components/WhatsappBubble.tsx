"use client";

import { usePathname } from "next/navigation";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import FAB from "@/components/FAB";
import { MessageCircle } from "lucide-react";

export default function WhatsappBubble() {
  const pathname = usePathname();
  
  // Ocultar en checkout y cuenta
  if (pathname?.startsWith("/checkout") || pathname?.startsWith("/cuenta")) {
    return null;
  }
  
  const whatsappUrl = getWhatsAppUrl();
  
  // No renderizar si no hay teléfono configurado
  if (!whatsappUrl) {
    return null;
  }
  
  // Offset para no encimarse con el carrito
  // CartBubble usa offset={88} cuando está vacío (carrito vacío)
  // CartSticky está en bottom-6 right-6 (24px desde abajo) cuando hay items
  // En mobile: el carrito sticky está en bottom-0 (barra inferior), así que WhatsApp puede estar arriba
  // En desktop: CartSticky está en bottom-6 (24px), así que WhatsApp debe estar más arriba
  // Usamos offset={88} para estar al mismo nivel que CartBubble cuando está vacío
  // Si hay items, CartSticky está en bottom-6, así que WhatsApp (offset 88 = 88px) queda más arriba
  return (
    <FAB offset={88}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir chat de WhatsApp de Depósito Dental Noriega"
        title="Abrir WhatsApp"
        className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            window.open(whatsappUrl, "_blank", "noopener,noreferrer");
          }
        }}
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </a>
    </FAB>
  );
}
