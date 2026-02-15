"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const QUICK_CATEGORIES = [
  { label: "Consumibles", href: ROUTES.tienda() },
  { label: "Ortodoncia", href: ROUTES.tienda() },
  { label: "Profilaxis", href: ROUTES.tienda() },
];

/**
 * 3 botones pill rápidos que llevan a /tienda.
 * Sin query de filtro para no romper contratos; listo para filtro futuro.
 */
export default function CategorySelector() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {QUICK_CATEGORIES.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "inline-flex items-center px-4 py-2 rounded-full text-sm font-medium",
              "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
              "hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
              "min-h-[44px]"
            )}
            aria-label={`Ver ${label} en tienda`}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
