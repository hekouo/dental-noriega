"use client";

import React from "react";
import Link from "next/link";
import { Shield, Truck, MessageCircle, CreditCard } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import { ROUTES } from "@/lib/routes";

type TrustItem = {
  icon: "shield" | "truck" | "whatsapp" | "card";
  title: string;
  subtitle?: string;
  href?: string;
};

type TrustStripProps = {
  items?: TrustItem[];
  variant?: "compact" | "checkout" | "pdp";
};

const iconMap = {
  shield: Shield,
  truck: Truck,
  whatsapp: MessageCircle,
  card: CreditCard,
};

/**
 * Componente reutilizable de trust bullets
 * Muestra elementos de confianza de forma discreta y consistente
 */
export default function TrustStrip({
  items,
  variant = "compact",
}: TrustStripProps) {
  // Items por defecto si no se proporcionan
  const defaultItems: TrustItem[] = items ?? [
    {
      icon: "card",
      title: "Pago seguro",
      subtitle: "Con tarjeta",
    },
    {
      icon: "truck",
      title: "Envío a todo México",
    },
    {
      icon: "whatsapp",
      title: "¿Dudas? Escríbenos",
      href: getWhatsAppUrl("Hola, tengo una pregunta sobre mi pedido.") ?? undefined,
    },
    {
      icon: "shield",
      title: "Atención postcompra",
    },
  ];

  const displayItems = items || defaultItems;

  // Estilos según variant (dark-mode friendly)
  const containerClass =
    variant === "checkout"
      ? "bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
      : variant === "pdp"
        ? "bg-gray-50/30 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-3"
        : "bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-lg p-3";

  const itemClass =
    variant === "checkout"
      ? "flex items-start gap-2 text-xs sm:text-sm"
      : "flex items-start gap-2 text-xs";

  return (
    <div className={containerClass}>
      <div
        className={`grid grid-cols-2 ${
          displayItems.length <= 2
            ? "md:grid-cols-2"
            : displayItems.length === 3
              ? "md:grid-cols-3"
              : "md:grid-cols-4"
        } gap-3 sm:gap-4`}
      >
        {displayItems.map((item, index) => {
          const IconComponent = iconMap[item.icon];
          const content = (
            <div className={itemClass}>
              <span className="flex-shrink-0 text-primary-600 mt-0.5">
                <IconComponent size={variant === "checkout" ? 18 : 16} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs mt-0.5">
                    {item.subtitle}
                  </p>
                )}
              </div>
            </div>
          );

          if (item.href) {
            return (
              <Link
                key={index}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 rounded-lg transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-700/30 p-1 -m-1"
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={index} className="p-1 -m-1">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

