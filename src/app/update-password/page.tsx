"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import PasswordInput from "@/components/auth/PasswordInput";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setIsValidSession(false);
        return;
      }

      try {
        // Verificar si hay un hash de recovery en la URL
        const hash = window.location.hash;
        if (hash) {
          // Parsear el hash para obtener tokens
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          
          if (accessToken && refreshToken) {
            // Establecer la sesión con los tokens del hash
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error("[UpdatePassword] Error al establecer sesión:", sessionError);
              setIsValidSession(false);
              return;
            }
          }
        }

        // Verificar si hay una sesión válida
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsValidSession(false);
          return;
        }
        setIsValidSession(true);
      } catch (err) {
        console.error("[UpdatePassword] Error al verificar sesión:", err);
        setIsValidSession(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsLoading(true);

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Error de configuración. Intenta más tarde.");
      setIsLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || "No se pudo actualizar la contraseña. Intenta de nuevo.");
      } else {
        setSuccess(true);
        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push("/cuenta");
        }, 2000);
      }
    } catch (err) {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
      console.error("[UpdatePassword] Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidSession === null) {
    return (
      <AuthShell title="Actualizando contraseña">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-4">Verificando sesión...</p>
        </div>
      </AuthShell>
    );
  }

  if (isValidSession === false) {
    return (
      <AuthShell title="Enlace inválido">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              Este enlace no es válido o ha expirado. Por favor, solicita un nuevo enlace de recuperación.
            </p>
          </div>
          <a
            href="/forgot-password"
            className="block w-full btn btn-primary text-center"
          >
            Solicitar nuevo enlace
          </a>
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800 mb-1">
                  Contraseña actualizada
                </h3>
                <p className="text-sm text-green-700">
                  Tu contraseña ha sido actualizada exitosamente. Serás redirigido a iniciar sesión.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <PasswordInput
            name="password"
            label="Nueva contraseña"
            placeholder="••••••••"
            required
            autoComplete="new-password"
            minLength={6}
          />

          <PasswordInput
            name="confirmPassword"
            label="Confirmar contraseña"
            placeholder="••••••••"
            required
            autoComplete="new-password"
            minLength={6}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

