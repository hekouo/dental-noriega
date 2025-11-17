"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

export type CheckoutStep = "cart" | "details" | "payment" | "success";

interface CheckoutStepperProps {
  current: CheckoutStep;
}

const steps: Array<{ key: CheckoutStep; label: string; href: string }> = [
  { key: "cart", label: "Carrito", href: "/checkout" },
  { key: "details", label: "Datos", href: "/checkout/datos" },
  { key: "payment", label: "Pago", href: "/checkout/pago" },
  { key: "success", label: "Confirmación", href: "/checkout/gracias" },
];

function getStepState(stepIndex: number, currentIndex: number) {
  const isCompleted = stepIndex < currentIndex;
  const isActive = stepIndex === currentIndex;
  const isClickable = isCompleted || isActive;
  return { isCompleted, isActive, isClickable };
}

function getStepCircleClass(isActive: boolean, isCompleted: boolean) {
  if (isCompleted) {
    return "bg-primary-600 border-primary-600 text-white";
  }
  if (isActive) {
    return "bg-primary-600 border-primary-600 text-white";
  }
  return "bg-white border-gray-300 text-gray-500";
}

type StepCircleProps = {
  step: { key: CheckoutStep; label: string; href: string };
  index: number;
  isCompleted: boolean;
  isActive: boolean;
  isClickable: boolean;
};

function StepCircle({
  step,
  index,
  isCompleted,
  isActive,
  isClickable,
}: StepCircleProps) {
  const circleClass = `flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${getStepCircleClass(isActive, isCompleted)}`;

  if (isClickable) {
    return (
      <Link
        href={step.href}
        className={circleClass}
        aria-current={isActive ? "step" : undefined}
        aria-label={`Paso ${index + 1}: ${step.label}`}
      >
        {isCompleted ? (
          <Check size={20} className="text-white" aria-hidden="true" />
        ) : (
          <span className="text-sm font-medium">{index + 1}</span>
        )}
      </Link>
    );
  }

  return (
    <div
      className={circleClass}
      aria-current={isActive ? "step" : undefined}
      aria-label={`Paso ${index + 1}: ${step.label}`}
    >
      <span className="text-sm font-medium">{index + 1}</span>
    </div>
  );
}

export default function CheckoutStepper({ current }: CheckoutStepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <nav aria-label="Progreso del checkout" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const { isCompleted, isActive, isClickable } = getStepState(
            index,
            currentIndex,
          );

          return (
            <li key={step.key} className="flex items-center flex-1">
              <div className="flex items-center flex-1">
                {/* Línea conectora */}
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isCompleted ? "bg-primary-600" : "bg-gray-300"
                    }`}
                  />
                )}

                {/* Círculo del paso */}
                <div className="flex flex-col items-center">
                  <StepCircle
                    step={step}
                    index={index}
                    isCompleted={isCompleted}
                    isActive={isActive}
                    isClickable={isClickable}
                  />

                  <span
                    className={`mt-2 text-xs font-medium transition-colors ${
                      isActive ? "text-primary-600" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Línea conectora después */}
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isCompleted ? "bg-primary-600" : "bg-gray-300"
                    }`}
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

