"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/lib/actions/auth";
import { ROUTES } from "@/lib/routes";
import AuthShell from "@/components/auth/AuthShell";
import { isValidEmail } from "@/lib/validation/email";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  // Rate limiting: cooldown de 60 segundos
  const lastRequestTimeRef = useRef<number>(0);
  const COOLDOWN_MS = 60 * 1000; // 60 segundos

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validar email no vacío
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("El correo electrónico es requerido");
      return;
    }

    // Validar formato de email
    if (!isValidEmail(trimmedEmail)) {
      setError("Por favor, ingresa un correo electrónico válido");
      return;
    }

    // Rate limiting: verificar cooldown
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    if (timeSinceLastRequest < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - timeSinceLastRequest) / 1000);
      setError(`Por favor, espera ${remainingSeconds} segundo${remainingSeconds > 1 ? "s" : ""} antes de solicitar otro enlace.`);
      return;
    }

    setIsLoading(true);

    try {
      const result = await forgotPasswordAction({ email: trimmedEmail });

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Actualizar tiempo de última request
        lastRequestTimeRef.current = Date.now();
      }
    } catch (err) {
      console.error("[ForgotPasswordClient] Error:", err);
      setError("Ocurrió un error. Inténtalo de nuevo.");
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
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
            <p className="font-medium mb-1">Correo enviado</p>
            <p className="text-sm">
              Si existe una cuenta asociada a <strong>{email}</strong>, recibirás un correo con un enlace para restablecer tu contraseña.
            </p>
            <p className="text-sm mt-2">
              Revisa tu bandeja de entrada y la carpeta de spam.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href={ROUTES.cuenta()}
              className="w-full btn btn-primary text-center"
            >
              Volver a iniciar sesión
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
              className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Enviar otro correo
            </button>
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
            <div>
              <label htmlFor="email" className="label">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="tu@email.com"
                autoComplete="email"
                autoFocus
              />
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
                  Enviando...
                </span>
              ) : (
                "Enviar enlace de recuperación"
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

