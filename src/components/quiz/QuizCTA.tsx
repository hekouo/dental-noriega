"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * CTA para el quiz/recomendador
 * Solo se muestra si NEXT_PUBLIC_ENABLE_QUIZ === "true" y en móvil
 */
export default function QuizCTA() {
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_QUIZ === "true";

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="md:hidden mb-6">
      <Link
        href="/quiz"
        className="flex items-center gap-3 px-4 py-3 min-h-[44px] bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg shadow-md transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        <Sparkles className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold">¿No sabes qué comprar?</p>
          <p className="text-xs opacity-90">Te recomiendo en 30s</p>
        </div>
        <span className="text-xs opacity-75">→</span>
      </Link>
    </div>
  );
}
