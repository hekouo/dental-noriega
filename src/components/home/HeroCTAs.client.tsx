"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import { buttonBase } from "@/lib/styles/button";
import { getTapClass } from "@/lib/ui/microAnims";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

type HeroCTAsProps = { variant?: "default" | "heritage" };

export default function HeroCTAs({ variant = "default" }: HeroCTAsProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const microAnimsEnabled = process.env.NEXT_PUBLIC_MOBILE_MICRO_ANIMS === "true";

  const isHeritage = variant === "heritage";

  const primaryClass = isHeritage
    ? `${buttonBase} rounded-xl border-2 border-amber-700/80 bg-amber-700/90 text-white hover:bg-amber-800 text-base sm:text-lg font-semibold px-8 sm:px-10 py-3 sm:py-4 transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-stone-100 shadow-md hover:shadow-lg`
    : `${buttonBase} rounded-xl bg-white text-primary-600 hover:bg-gray-50 text-lg font-semibold px-10 py-4 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-primary-600 shadow-lg hover:shadow-xl`;

  const secondaryClass = isHeritage
    ? `${buttonBase} rounded-xl border-2 border-amber-300/90 bg-transparent text-stone-700 hover:bg-amber-50 text-base sm:text-lg font-semibold px-8 sm:px-10 py-3 sm:py-4 transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-stone-100`
    : `${buttonBase} rounded-xl bg-primary-700/90 backdrop-blur-sm text-white hover:bg-primary-800 text-lg font-semibold px-10 py-4 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-primary-600 border border-white/20 shadow-lg hover:shadow-xl`;

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-4 sm:mb-6">
      <Link
        href={ROUTES.tienda()}
        className={getTapClass({
          kind: "button",
          enabled: microAnimsEnabled,
          reducedMotion: prefersReducedMotion,
          className: primaryClass,
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
          className: secondaryClass,
        })}
      >
        <MessageCircle className="inline-block mr-2 w-5 h-5" aria-hidden="true" />
        <span>{isHeritage ? "Consultar por WhatsApp" : "Contactar por WhatsApp"}</span>
      </Link>
    </div>
  );
}
