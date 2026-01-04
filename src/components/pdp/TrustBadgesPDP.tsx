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
};

/**
 * Versión de TrustBadges para PDP (colores adaptados para fondo claro)
 */
export default function TrustBadgesPDP() {
  const whatsappUrl = getWhatsAppUrl("Hola, me interesa información sobre sus productos.");

  const badges: BadgeItem[] = [
    {
      icon: <Truck size={16} />,
      label: "Envío a todo México",
    },
    {
      icon: <MessageCircle size={16} />,
      label: "Soporte WhatsApp",
      href: whatsappUrl ?? undefined,
    },
    {
      icon: <Award size={16} />,
      label: "Puntos de lealtad",
      href: ROUTES.cuenta(),
    },
    {
      icon: <Shield size={16} />,
      label: "Pago seguro",
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-start gap-3 py-3">
      {badges.map((badge, index) => {
        const content = (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
            <span className="flex-shrink-0 text-gray-600 dark:text-gray-400">{badge.icon}</span>
            <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{badge.label}</span>
          </div>
        );

        if (badge.href) {
          return (
            <Link
              key={index}
              href={badge.href}
              target={badge.href.startsWith("http") ? "_blank" : undefined}
              rel={badge.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded-lg"
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

