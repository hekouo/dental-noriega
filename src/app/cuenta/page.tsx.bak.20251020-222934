"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { loginAction, registerAction } from "@/lib/actions/auth";

export default function CuentaPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value as string;
    });

    try {
      if (mode === "login") {
        const validated = loginSchema.parse(data);
        const result = await loginAction(validated);

        if (result?.error) {
          setError(result.error);
        } else {
          router.push("/cuenta/perfil");
        }
      } else {
        const validated = registerSchema.parse(data);
        const result = await registerAction(validated);

        if (result?.error) {
          setError(result.error);
        } else if (result?.success) {
          setSuccess(result.message);
        }
      }
    } catch (err: any) {
      if (err.errors) {
        setError(err.errors[0].message);
      } else {
        setError("Ocurrió un error. Inténtalo de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-2">
          {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
        </h1>
        <p className="text-gray-600 text-center mb-8">
          {mode === "login"
            ? "Ingresa a tu cuenta para continuar"
            : "Regístrate y comienza a ganar puntos"}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="label">Nombre completo</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  className="input"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="label">Teléfono (opcional)</label>
                <input
                  type="tel"
                  name="phone"
                  className="input"
                  placeholder="5512345678"
                />
              </div>
            </>
          )}

          <div>
            <label className="label">Correo electrónico</label>
            <input
              type="email"
              name="email"
              required
              className="input"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              name="password"
              required
              className="input"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="label">Confirmar contraseña</label>
              <input
                type="password"
                name="confirmPassword"
                required
                className="input"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary disabled:opacity-50"
          >
            {isLoading
              ? "Procesando..."
              : mode === "login"
                ? "Iniciar Sesión"
                : "Crear Cuenta"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setSuccess("");
            }}
            className="text-primary-600 hover:underline"
          >
            {mode === "login"
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
