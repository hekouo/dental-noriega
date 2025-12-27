"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updatePasswordAction } from "@/lib/actions/auth";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import AuthShell from "@/components/auth/AuthShell";
import PasswordInput from "@/components/auth/PasswordInput";

export default function UpdatePasswordClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const router = useRouter();

  // Verificar si hay una sesión válida de recuperación de contraseña
  useEffect(() => {
    const checkSession = async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setIsCheckingSession(false);
        setError("Error al inicializar la sesión.");
        return;
      }

      try {
        // Verificar si hay un hash de recovery en la URL primero
        const hash = window.location.hash;
        if (hash.includes("access_token") || hash.includes("type=recovery")) {
          // El callback ya procesó el código, solo verificamos la sesión
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setHasValidSession(true);
          } else {
            setError("El enlace de recuperación no es válido o ha expirado.");
          }
          setIsCheckingSession(false);
          return;
        }

        // Si no hay hash, verificar sesión actual
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasValidSession(true);
        } else {
          setError("No hay una sesión válida. Por favor, solicita un nuevo enlace de recuperación.");
        }
      } catch (err) {
        setError("Error al verificar la sesión.");
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const password = (formData.get("password") as string) || "";
    const confirmPassword = (formData.get("confirmPassword") as string) || "";

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
        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push(ROUTES.cuenta());
        }, 2000);
      }
    } catch (err) {
      setError("Ocurrió un error. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <AuthShell
        title="Actualizar contraseña"
        subtitle="Verificando enlace de recuperación..."
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </AuthShell>
    );
  }

  if (!hasValidSession && !error) {
    return (
      <AuthShell
        title="Actualizar contraseña"
        subtitle="Sesión inválida"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg">
            <p className="text-sm">
              No se encontró una sesión válida. Por favor, solicita un nuevo enlace de recuperación.
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
      title="Actualizar contraseña"
      subtitle="Ingresa tu nueva contraseña"
    >
      {success ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
            <p className="font-medium mb-1">¡Contraseña actualizada!</p>
            <p className="text-sm">
              Tu contraseña ha sido actualizada exitosamente. Redirigiendo...
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

