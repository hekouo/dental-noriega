"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") || "Error desconocido";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-4 text-red-600">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Error de autenticación
        </h1>
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        <div className="space-y-2">
          <Link href="/forgot-password" className="btn btn-primary block">
            Solicitar nuevo enlace
          </Link>
          <Link
            href="/cuenta"
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline block"
          >
            ← Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Cargando...</h1>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}

