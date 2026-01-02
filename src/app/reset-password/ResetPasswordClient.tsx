"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { updatePasswordAction } from "@/lib/actions/auth";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import AuthShell from "@/components/auth/AuthShell";
import PasswordInput from "@/components/auth/PasswordInput";

const DEBUG_AUTH_CALLBACK = process.env.NEXT_PUBLIC_DEBUG_AUTH_CALLBACK === "true";

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isProcessingAuth, setIsProcessingAuth] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Procesar autenticación directamente desde query/hash (Plan B robusto)
  useEffect(() => {
    const processAuth = async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setIsProcessingAuth(false);
        setError("Error al inicializar la sesión.");
        return;
      }

      try {
        // Leer URL completa INMEDIATAMENTE al montar (antes de cualquier redirect)
        const currentSearch = window.location.search;
        const currentHash = window.location.hash;
        const currentPathname = window.location.pathname;

        // Debug seguro (solo si está habilitado)
        if (DEBUG_AUTH_CALLBACK) {
          const debug = {
            pathname: currentPathname,
            hasQuery: currentSearch.length > 0,
            hasHash: currentHash.length > 0,
            queryLength: currentSearch.length,
            hashLength: currentHash.length,
          };
          setDebugInfo(JSON.stringify(debug, null, 2));
          console.log("[reset-password] Debug info:", debug);
        }

        // Leer query params desde la URL actual
        const urlSearchParams = new URLSearchParams(currentSearch);
        const code = urlSearchParams.get("code") || searchParams?.get("code") || null;
        const type = urlSearchParams.get("type") || searchParams?.get("type") || null;

        // Leer hash (si existe)
        const hashParams = new URLSearchParams(currentHash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashType = hashParams.get("type");

        // Si hay code o tokens, procesarlos primero
        if (code) {
          // Caso 1: Hay code en query params
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error("[reset-password] Error exchanging code:", {
              error: exchangeError.message,
              type,
            });
            setError(`Error al procesar el enlace: ${exchangeError.message}`);
            setIsProcessingAuth(false);
            return;
          }
        } else if (accessToken && refreshToken) {
          // Caso 2: Hay tokens en hash
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("[reset-password] Error setting session:", {
              error: sessionError.message,
              type: hashType,
            });
            setError(`Error al procesar el enlace: ${sessionError.message}`);
            setIsProcessingAuth(false);
            return;
          }
        }

        // Verificar sesión después de procesar code/tokens
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[reset-password] Error checking session:", sessionError);
          setError("Error al verificar la sesión. Por favor, solicita un nuevo enlace.");
          setIsProcessingAuth(false);
          return;
        }

        if (session) {
          setHasValidSession(true);
        } else {
          // Si no hay code/tokens y no hay sesión, mostrar error
          if (!code && !accessToken) {
            setError("No se encontró código de autenticación ni tokens. El enlace puede haber expirado o ya fue usado.");
          } else {
            setError("No hay una sesión válida. El enlace de recuperación puede haber expirado o ya fue usado.");
          }
        }
      } catch (err) {
        console.error("[reset-password] Unexpected error:", err);
        setError("Error inesperado al procesar el enlace.");
      } finally {
        setIsProcessingAuth(false);
      }
    };

    processAuth();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const password = (formData.get("password") as string) || "";
    const confirmPassword = (formData.get("confirmPassword") as string) || "";

    // Validaciones básicas
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      const result = await updatePasswordAction({ password });

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        
        // Sign out y redirigir al login después de 2 segundos
        const supabase = getBrowserSupabase();
        if (supabase) {
          await supabase.auth.signOut();
        }
        
        setTimeout(() => {
          router.push(ROUTES.cuenta());
        }, 2000);
      }
    } catch (err) {
      console.error("[reset-password] Error updating password:", err);
      setError("Ocurrió un error. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isProcessingAuth) {
    return (
      <AuthShell
        title="Restablecer contraseña"
        subtitle="Verificando enlace de recuperación..."
      >
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          {DEBUG_AUTH_CALLBACK && debugInfo && (
            <div className="mt-4 p-4 bg-gray-100 rounded text-xs font-mono max-w-md overflow-auto">
              <div className="font-bold mb-2">Debug Info:</div>
              <pre>{debugInfo}</pre>
            </div>
          )}
        </div>
      </AuthShell>
    );
  }

  if (!hasValidSession) {
    return (
      <AuthShell
        title="Restablecer contraseña"
        subtitle="Enlace inválido o expirado"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}
          {DEBUG_AUTH_CALLBACK && debugInfo && (
            <div className="p-4 bg-gray-100 rounded text-xs font-mono max-w-md overflow-auto">
              <div className="font-bold mb-2">Debug Info:</div>
              <pre>{debugInfo}</pre>
            </div>
          )}
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg">
            <p className="text-sm mb-2">
              El enlace de recuperación no es válido o ha expirado. Por favor, solicita un nuevo enlace.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="w-full btn btn-primary text-center block"
          >
            Solicitar nuevo enlace
          </Link>
          <div className="text-center">
            <Link
              href={ROUTES.cuenta()}
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              ← Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Restablecer contraseña"
      subtitle="Ingresa tu nueva contraseña"
    >
      {success ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
            <p className="font-medium mb-1">¡Contraseña actualizada!</p>
            <p className="text-sm">
              Tu contraseña ha sido actualizada exitosamente. Redirigiendo al inicio de sesión...
            </p>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              name="password"
              label="Nueva contraseña"
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
            />

            <PasswordInput
              name="confirmPassword"
              label="Confirmar contraseña"
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
            />

            <div className="text-xs text-gray-500">
              La contraseña debe tener al menos 6 caracteres.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Actualizando...
                </span>
              ) : (
                "Actualizar contraseña"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href={ROUTES.cuenta()}
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              ← Volver a iniciar sesión
            </Link>
          </div>
        </>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordClient() {
  return (
    <Suspense fallback={
      <AuthShell
        title="Restablecer contraseña"
        subtitle="Cargando..."
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </AuthShell>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

