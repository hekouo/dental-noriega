"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { SITE } from "@/lib/site";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Error de configuración. Intenta más tarde.");
      setIsLoading(false);
      return;
    }

    try {
      const redirectTo = `${SITE.url}/update-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message || "No se pudo enviar el correo. Intenta de nuevo.");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
      console.error("[ForgotPassword] Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña"
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
                  Correo enviado
                </h3>
                <p className="text-sm text-green-700">
                  Revisa tu correo electrónico. Si existe una cuenta asociada a{" "}
                  <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <Link
              href="/cuenta"
              className="block w-full btn btn-primary text-center"
            >
              Volver a iniciar sesión
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
              className="block w-full px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Intentar con otro correo
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="tu@email.com"
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Enviando..." : "Enviar enlace de recuperación"}
          </button>

          <div className="text-center">
            <Link
              href="/cuenta"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

