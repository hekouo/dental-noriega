"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Leer URL completa INMEDIATAMENTE al montar (antes de cualquier redirect)
        // Esto asegura que capturamos query params y hash incluso si hay redirects
        const currentSearch = window.location.search;
        const currentHash = window.location.hash;
        const currentPathname = window.location.pathname;

        // Logging para debug (sin exponer tokens)
        console.log("[auth/callback] URL recibida al montar:", {
          pathname: currentPathname,
          hasQuery: currentSearch.length > 0,
          hasHash: currentHash.length > 0,
          queryLength: currentSearch.length,
          hashLength: currentHash.length,
          queryStart: currentSearch.substring(0, 20) + (currentSearch.length > 20 ? "..." : ""), // Solo primeros 20 chars
          hashStart: currentHash.substring(0, 20) + (currentHash.length > 20 ? "..." : ""), // Solo primeros 20 chars
        });

        const supabase = getBrowserSupabase();
        if (!supabase) {
          setStatus("error");
          setErrorMessage("Error al inicializar la sesión");
          setTimeout(() => router.push("/cuenta?error=init"), 2000);
          return;
        }

        // Leer query params desde la URL actual (no solo desde searchParams que puede estar desactualizado)
        // Usar window.location.search directamente para evitar problemas de timing
        const urlSearchParams = new URLSearchParams(currentSearch);
        const code = urlSearchParams.get("code") || searchParams?.get("code") || null;
        const type = urlSearchParams.get("type") || searchParams?.get("type") || null;
        const nextParam = urlSearchParams.get("next") || searchParams?.get("next") || null;

        // Leer hash (si existe) - siempre desde window.location.hash directamente
        const hashParams = new URLSearchParams(currentHash.substring(1)); // Remover #
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashType = hashParams.get("type");

        // Logging para debug (sin exponer tokens)
        console.log("[auth/callback] Parámetros detectados:", {
          hasCode: !!code,
          codeLength: code?.length || 0,
          type,
          nextParam,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hashType,
          searchParamsAvailable: !!searchParams,
        });

        // Determinar next path
        let nextPath = "/cuenta";
        if (nextParam && nextParam.startsWith("/")) {
          nextPath = nextParam;
        } else if (type === "recovery" || hashType === "recovery") {
          nextPath = "/reset-password";
        } else if (type === "signup" || hashType === "signup" || type === "magiclink" || hashType === "magiclink") {
          nextPath = "/cuenta?verified=1";
        }

        // Caso 1: Hay code en query params (server-side flow)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error("[auth/callback] Error exchanging code:", {
              error: error.message,
              type,
            });
            setStatus("error");
            setErrorMessage(error.message);
            setTimeout(() => {
              router.push(`/cuenta?error=auth&message=${encodeURIComponent(error.message)}`);
            }, 2000);
            return;
          }

          // Éxito: redirigir
          router.push(nextPath);
          return;
        }

        // Caso 2: Hay tokens en hash (client-side flow)
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("[auth/callback] Error setting session:", {
              error: error.message,
              type: hashType,
            });
            setStatus("error");
            setErrorMessage(error.message);
            setTimeout(() => {
              router.push(`/cuenta?error=auth&message=${encodeURIComponent(error.message)}`);
            }, 2000);
            return;
          }

          // Éxito: redirigir
          router.push(nextPath);
          return;
        }

        // Si no hay code ni tokens, error
        console.warn("[auth/callback] No code or tokens found");
        setStatus("error");
        setErrorMessage("No se encontró código de autenticación ni tokens");
        setTimeout(() => {
          router.push("/cuenta?error=missing_code");
        }, 2000);
      } catch (err) {
        console.error("[auth/callback] Unexpected error:", {
          error: err instanceof Error ? err.message : String(err),
        });
        setStatus("error");
        setErrorMessage("Error inesperado al procesar la autenticación");
        setTimeout(() => {
          router.push("/cuenta?error=unexpected");
        }, 2000);
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
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
          <h1 className="text-xl font-semibold text-gray-900">Error de autenticación</h1>
          <p className="mt-2 text-sm text-gray-600">
            {errorMessage || "Ocurrió un error al procesar tu solicitud"}
          </p>
          <p className="mt-4 text-xs text-gray-500">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Procesando autenticación</h1>
        <p className="mt-2 text-sm text-gray-600">Por favor espera...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
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
      <AuthCallbackContent />
    </Suspense>
  );
}

