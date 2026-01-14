"use client";

import React from "react";
import Link from "next/link";
import { Truck, MessageCircle, Award, Shield } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";

type BadgeItem = {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
};

export default function TrustBadges() {
  const accentEnabled = process.env.NEXT_PUBLIC_ENABLE_ACCENT_UI === "true";
  
  const badges: BadgeItem[] = [
    {
      icon: <Truck size={18} />,
      label: "Envío a todo México",
    },
    {
      icon: <MessageCircle size={18} />,
      label: "Soporte WhatsApp",
      href: getWhatsAppUrl("Hola, me interesa información sobre sus productos.") ?? undefined,
    },
    {
      icon: <Award size={18} />,
      label: "Puntos de lealtad",
      href: ROUTES.cuenta(),
    },
    {
      icon: <Shield size={18} />,
      label: "Pago seguro",
    },
  ];

  // Determinar clases según flag de accent
  const getBadgeClasses = (index: number) => {
    if (!accentEnabled) {
      return "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white border border-white/20 transition-all duration-200 hover:bg-white/20 hover:scale-105 active:scale-95";
    }
    
    // Aplicar accents: mint para soporte/envío, amber para puntos
    const isMint = index === 0 || index === 1 || index === 3; // Envío, WhatsApp, Pago seguro
    const isAmber = index === 2; // Puntos
    
    if (isMint) {
      return "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-mint-500/20 backdrop-blur-sm rounded-full text-sm text-white border border-mint-400/30 transition-all duration-200 hover:bg-mint-500/30 hover:scale-105 active:scale-95";
    }
    if (isAmber) {
      return "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-500/20 backdrop-blur-sm rounded-full text-sm text-white border border-amber-400/30 transition-all duration-200 hover:bg-amber-500/30 hover:scale-105 active:scale-95";
    }
    
    return "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white border border-white/20 transition-all duration-200 hover:bg-white/20 hover:scale-105 active:scale-95";
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
      {badges.map((badge, index) => {
        const content = (
          <div className={getBadgeClasses(index)}>
            <span className="flex-shrink-0">{badge.icon}</span>
            <span className="font-medium whitespace-nowrap">{badge.label}</span>
          </div>
        );

        if (badge.href) {
          return (
            <Link
              key={index}
              href={badge.href}
              target={badge.href.startsWith("http") ? "_blank" : undefined}
              rel={badge.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-primary-600 rounded-full"
            >
              {content}
            </Link>
          );
        }

        return <div key={index}>{content}</div>;
      })}
    </div>
  );
}

