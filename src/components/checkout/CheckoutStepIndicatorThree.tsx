"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";

/**
 * Indicador visual simple: Dirección → Envío → Pago.
 * Solo presentación; basado en la ruta actual. No modifica lógica.
 */
const STEPS = [
  { label: "Dirección", href: "/checkout/datos" },
  { label: "Envío", href: "/checkout/datos" },
  { label: "Pago", href: "/checkout/pago" },
] as const;

export default function CheckoutStepIndicatorThree() {
  const pathname = usePathname() ?? "";
  const isPago = pathname.includes("/checkout/pago");
  const isDatos = pathname.includes("/checkout/datos");

  const activeIndex = isPago ? 2 : 0;

  return (
    <nav aria-label="Pasos del checkout: dirección, envío, pago" className="mb-6">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          const isClickable = isCompleted || (index === 0 && isDatos) || (index === 1 && isDatos) || (index === 2 && isPago);

          const circleClass = [
            "flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-medium transition-colors",
            isCompleted && "bg-primary-600 border-primary-600 text-white",
            isActive && "bg-primary-600 border-primary-600 text-white",
            !isCompleted && !isActive && "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500",
          ].filter(Boolean).join(" ");

          return (
            <li key={step.label} className="flex items-center flex-1">
              <div className="flex items-center flex-1">
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isCompleted ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-600"
                    }`}
                    aria-hidden="true"
                  />
                )}
                <div className="flex flex-col items-center">
                  {isClickable ? (
                    <Link
                      href={step.href}
                      className={circleClass}
                      aria-current={isActive ? "step" : undefined}
                      aria-label={`Paso ${index + 1}: ${step.label}`}
                    >
                      {isCompleted ? <Check size={18} aria-hidden="true" /> : <span>{index + 1}</span>}
                    </Link>
                  ) : (
                    <div className={circleClass} aria-current={isActive ? "step" : undefined}>
                      <span>{index + 1}</span>
                    </div>
                  )}
                  <span
                    className={`mt-1.5 text-xs font-medium ${
                      isActive ? "text-primary-600 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isCompleted ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-600"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
