"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import FAB from "@/components/FAB";
import { MessageCircle } from "lucide-react";
import { trackWhatsappClick } from "@/lib/analytics/events";

export default function WhatsappBubble() {
  const pathname = usePathname();
  const [isPulsing, setIsPulsing] = useState(false);
  const whatsappUrl = getWhatsAppUrl();
  
  // Animación de pulse cada 8-10 segundos
  useEffect(() => {
    if (!whatsappUrl) return;
    
    const interval = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 1000);
    }, 9000); // Cada 9 segundos (8-10s promedio)
    
    return () => clearInterval(interval);
  }, [whatsappUrl]);
  
  // Ocultar solo en checkout
  if (pathname?.startsWith("/checkout")) {
    return null;
  }
  
  // No renderizar si no hay teléfono configurado
  if (!whatsappUrl) {
    return null;
  }
  
  // Offset para no encimarse con el carrito
  // CartBubble usa offset={88} cuando está vacío (carrito vacío)
  // CartSticky está en bottom-0 (barra completa) en mobile cuando hay items
  // En mobile: el carrito sticky está en bottom-0 (barra inferior ~48px de altura), así que WhatsApp debe estar más arriba
  // Usamos offset={96} (24px = 6rem) para estar arriba del carrito sticky en mobile
  const handleClick = () => {
    trackWhatsappClick({ context: "floating" });
  };

  return (
    <div className="md:hidden">
      <FAB offset={96}>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          aria-label="Abrir chat de WhatsApp de Depósito Dental Noriega"
          title="Abrir WhatsApp"
          className={`h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${isPulsing ? "animate-pulse-subtle" : ""}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
              window.open(whatsappUrl, "_blank", "noopener,noreferrer");
            }
          }}
        >
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        </a>
      </FAB>
    </div>
  );
}
