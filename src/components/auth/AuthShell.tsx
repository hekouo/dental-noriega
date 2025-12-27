"use client";

import React from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

type AuthShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBranding?: boolean;
};

/**
 * Shell reutilizable para páginas de autenticación
 * Layout moderno con gradiente de fondo y animaciones suaves
 */
export default function AuthShell({
  children,
  title,
  subtitle,
  showBranding = true,
}: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Blobs decorativos animados */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {showBranding && (
          <div className="text-center mb-8">
            <Link
              href={ROUTES.home()}
              className="inline-block mb-4 transition-transform hover:scale-105 active:scale-95"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-primary-600">
                Depósito Dental Noriega
              </h1>
            </Link>
            {title && (
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 animate-[fadeInUp_0.5s_ease-out_backwards]">
          {children}
        </div>

        {/* Links útiles */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <Link
            href={ROUTES.home()}
            className="hover:text-primary-600 transition-colors underline underline-offset-2"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

