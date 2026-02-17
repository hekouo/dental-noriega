"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppPhone } from "@/lib/whatsapp/config";
import { buildWhatsAppUrl } from "@/lib/whatsapp/format";
import { buttonBase } from "@/lib/styles/button";
import AmbientBackground from "./AmbientBackground";
import Logo from "@/components/common/Logo";
import IconRail from "@/components/common/IconRail";
import { getTapClass } from "@/lib/ui/microAnims";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/**
 * HeroIntro: hero editorial premium con background sutil, Logo y IconRail.
 * CTA primario: Explorar catálogo | CTA secundario: Habla con un asesor (WhatsApp).
 */
export default function HeroIntro() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const microAnimsEnabled = process.env.NEXT_PUBLIC_MOBILE_MICRO_ANIMS === "true";
  const ASESOR_MESSAGE = "Hola, necesito ayuda con mi compra en DDN.";
  const ddnPhone = getWhatsAppPhone();
  const waUrl = ddnPhone
    ? buildWhatsAppUrl({ phoneE164OrMX: ddnPhone, text: ASESOR_MESSAGE })
    : null;

  const primaryClass = `${buttonBase} rounded-2xl bg-primary-600 text-white hover:bg-primary-700 text-base sm:text-lg font-semibold px-8 sm:px-10 py-3 sm:py-4 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-primary-300 focus:ring-offset-2 focus:ring-offset-transparent`;

  const secondaryClass = `${buttonBase} rounded-2xl bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white border border-amber-200/90 text-base sm:text-lg font-semibold px-8 sm:px-10 py-3 sm:py-4 transition-all duration-200 hover:border-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-transparent shadow-sm`;

  return (
    <section className="relative min-h-[60vh] sm:min-h-[65vh] md:min-h-[70vh] flex flex-col justify-center py-12 sm:py-14 md:py-20 px-5 sm:px-6 overflow-hidden w-full bg-[#faf8f5] dark:bg-gray-900/95">
      <AmbientBackground />

      <div className="relative max-w-6xl mx-auto w-full text-center">
        {/* Logo */}
        <div className="mb-6 sm:mb-8">
          <Logo variant="horizontal" size="lg" />
        </div>

        {/* Headline - sin saludo contextual */}
        <h1 className="font-hero text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 sm:mb-6 text-gray-900 dark:text-white leading-tight">
          Tu clínica merece compras fáciles
        </h1>
        <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Atención personalizada por WhatsApp, precios claros en MXN y pago seguro. Envíos a todo México.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8">
          <Link
            href={ROUTES.tienda()}
            className={getTapClass({
              kind: "button",
              enabled: microAnimsEnabled,
              reducedMotion: prefersReducedMotion,
              className: primaryClass,
            })}
          >
            <span className="whitespace-nowrap">Explorar catálogo</span>
          </Link>
          <a
            href={waUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={getTapClass({
              kind: "button",
              enabled: microAnimsEnabled,
              reducedMotion: prefersReducedMotion,
              className: secondaryClass + " focus-premium",
            })}
            aria-label="Habla con un asesor por WhatsApp"
          >
            <MessageCircle className="inline-block mr-2 w-5 h-5 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">Habla con un asesor</span>
          </a>
        </div>

        {/* Icon Rail - beneficios */}
        <div className="mt-4 sm:mt-6">
          <IconRail />
        </div>
      </div>
    </section>
  );
}
