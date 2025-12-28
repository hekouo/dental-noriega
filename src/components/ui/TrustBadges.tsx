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

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
      {badges.map((badge, index) => {
        const content = (
          <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white border border-white/20 transition-all duration-200 hover:bg-white/20 hover:scale-105 active:scale-95">
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

