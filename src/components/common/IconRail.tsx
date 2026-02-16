"use client";

import React from "react";
import Link from "next/link";
import { Truck, MessageCircle, Award, Shield } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

type ChipItem = {
  icon: React.ReactNode;
  label: string;
  href?: string;
};

const chips: ChipItem[] = [
  { icon: <Truck size={18} aria-hidden />, label: "Envío a todo México" },
  {
    icon: <MessageCircle size={18} aria-hidden />,
    label: "Soporte WhatsApp",
    href: getWhatsAppUrl("Hola, me interesa información sobre sus productos.") ?? undefined,
  },
  { icon: <Award size={18} aria-hidden />, label: "Puntos de lealtad", href: ROUTES.cuenta() },
  { icon: <Shield size={18} aria-hidden />, label: "Pago seguro" },
];

/**
 * IconRail: chips con iconos, overflow-x scroll-snap.
 * Hover micro: scale 1.02–1.05 + sombra suave.
 * Reduced motion: sin animaciones automáticas, solo hover permitido (transición CSS).
 */
export default function IconRail() {
  return (
    <div className="w-full">
      <div
        className="overflow-x-auto overflow-y-hidden no-scrollbar pb-2 -mx-1"
        style={{
          maskImage: "linear-gradient(to right, black 85%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, black 85%, transparent 100%)",
        }}
      >
        <div
          className="flex gap-3 sm:gap-4 min-w-max px-1"
          style={{ scrollSnapType: "x mandatory" }}
          role="list"
        >
        {chips.map((chip, index) => {
          const chipContent = (
            <span
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-amber-200/90 bg-amber-50/80 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200 shadow-sm transition-transform duration-200 hover:scale-[1.03] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 min-h-[44px]"
              style={{ scrollSnapAlign: "start" }}
            >
              {chip.icon}
              <span className="font-medium whitespace-nowrap text-sm">{chip.label}</span>
            </span>
          );

          if (chip.href) {
            return (
              <Link
                key={index}
                href={chip.href}
                target={chip.href.startsWith("http") ? "_blank" : undefined}
                rel={chip.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="focus-premium tap-feedback shrink-0"
                role="listitem"
              >
                {chipContent}
              </Link>
            );
          }

          return (
            <div key={index} role="listitem" className="shrink-0">
              {chipContent}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
