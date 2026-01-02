"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AuthConfirmContent() {
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenHash = searchParams?.get("token_hash") || null;
  const type = searchParams?.get("type") || null;
  const nextParam = searchParams?.get("next") || null;

  const handleConfirm = async () => {
    if (!tokenHash) {
      setError("No se encontró token de verificación");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("token_hash", tokenHash);
      if (type) formData.append("type", type);
      if (nextParam) formData.append("next", nextParam);

      const response = await fetch("/auth/confirm/api", {
        method: "POST",
        body: formData,
      });

      if (response.redirected) {
        // La redirección se maneja automáticamente
        window.location.href = response.url;
      } else if (!response.ok) {
        const errorText = await response.text();
        setError(`Error: ${errorText || "Error al verificar el enlace"}`);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("[auth/confirm] Error:", err);
      setError("Error inesperado al procesar el enlace");
      setIsProcessing(false);
    }
  };

  if (!tokenHash) {
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
            Enlace inválido
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            No se encontró token de verificación en el enlace.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block btn btn-primary"
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Verificar enlace
          </h1>
          <p className="text-sm text-gray-600">
            {type === "recovery"
              ? "Haz clic en el botón para continuar con el restablecimiento de contraseña."
              : "Haz clic en el botón para verificar tu enlace."}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={isProcessing}
          className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Verificando...
            </span>
          ) : (
            "Continuar"
          )}
        </button>

        <div className="mt-6 text-center">
          <Link
            href="/cuenta"
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            ← Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
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
      <AuthConfirmContent />
    </Suspense>
  );
}

