"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import { buttonBase } from "@/lib/styles/button";
import { getTapClass } from "@/lib/ui/microAnims";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

export default function HeroCTAs() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const microAnimsEnabled = process.env.NEXT_PUBLIC_MOBILE_MICRO_ANIMS === "true";

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6 sm:mb-8">
      <Link
        href={ROUTES.tienda()}
        className={getTapClass({
          kind: "button",
          enabled: microAnimsEnabled,
          reducedMotion: prefersReducedMotion,
          className: `${buttonBase} rounded-xl bg-white text-primary-600 hover:bg-gray-50 text-lg font-semibold px-10 py-4 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-primary-600 shadow-lg hover:shadow-xl`,
        })}
      >
        <span>Ver tienda</span>
      </Link>
      <Link
        href={getWhatsAppUrl("Hola, me interesa información sobre sus productos.") ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className={getTapClass({
          kind: "button",
          enabled: microAnimsEnabled,
          reducedMotion: prefersReducedMotion,
          className: `${buttonBase} rounded-xl bg-primary-700/90 backdrop-blur-sm text-white hover:bg-primary-800 text-lg font-semibold px-10 py-4 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-primary-600 border border-white/20 shadow-lg hover:shadow-xl`,
        })}
      >
        <MessageCircle className="inline-block mr-2 w-5 h-5" aria-hidden="true" />
        <span>Contactar por WhatsApp</span>
      </Link>
    </div>
  );
}
