"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { loginAction, registerAction } from "@/lib/actions/auth";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isValidEmail } from "@/lib/validation/email";
import {
  LOYALTY_MIN_POINTS_FOR_DISCOUNT,
  LOYALTY_DISCOUNT_PERCENT,
} from "@/lib/loyalty/config";
import EmailVerificationBanner from "@/components/account/EmailVerificationBanner";
import AccountInfoBanner from "@/components/account/AccountInfoBanner";

export default function CuentaClientPage() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    (searchParams?.get("mode") as "login" | "register") || "login"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  
  // Estado para puntos de lealtad
  const [loyaltyPoints, setLoyaltyPoints] = useState<{
    pointsBalance: number;
    lifetimeEarned: number;
    canApplyDiscount: boolean;
  } | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!searchParams) return;
    const modeParam = searchParams.get("mode");
    if (modeParam === "register" || modeParam === "login") {
      setMode(modeParam);
    }
  }, [searchParams]);

  // Cargar email del usuario autenticado y puntos de lealtad
  useEffect(() => {
    const loadUserEmailAndPoints = async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && isValidEmail(user.email)) {
          setUserEmail(user.email);
          setIsEmailVerified(!!user.email_confirmed_at);
          // Cargar puntos de lealtad
          setLoyaltyLoading(true);
          try {
            const response = await fetch(
              `/api/account/loyalty?email=${encodeURIComponent(user.email)}`,
            );
            if (response.ok) {
              const data = await response.json();
              setLoyaltyPoints({
                pointsBalance: data.pointsBalance || 0,
                lifetimeEarned: data.lifetimeEarned || 0,
                canApplyDiscount: data.canApplyDiscount || false,
              });
            }
          } catch (err) {
            console.error("[CuentaClientPage] Error al cargar puntos:", err);
          } finally {
            setLoyaltyLoading(false);
          }
        }
      } catch (authError) {
        // Ignorar errores de autenticación
        if (process.env.NODE_ENV === "development") {
          console.debug("[CuentaClientPage] Error de autenticación ignorado:", authError);
        }
      }
    };

    loadUserEmailAndPoints();
  }, []);

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
          // Traducir errores comunes de Supabase a español
          const errorMessage = result.error;
          if (errorMessage.includes("Invalid login") || errorMessage.includes("Invalid credentials")) {
            setError("Correo o contraseña incorrectos.");
          } else if (errorMessage.includes("Email not confirmed") || errorMessage.includes("email_not_confirmed")) {
            setError("Debes confirmar tu correo antes de iniciar sesión.");
          } else {
            setError(errorMessage);
          }
        } else {
          router.push("/cuenta/direcciones");
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
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "errors" in err &&
        Array.isArray((err as { errors: Array<{ message?: string }> }).errors)
      ) {
        const zodErr = err as { errors: Array<{ message?: string }> };
        setError(
          zodErr.errors[0]?.message || "Ocurrió un error. Inténtalo de nuevo.",
        );
      } else {
        setError("Ocurrió un error. Inténtalo de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8 sm:py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-2 text-gray-900">
          {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
        </h1>
        {mode === "register" && (
          <p className="text-sm text-gray-600 text-center mb-2">
            Crea tu cuenta para acumular puntos y ver tus pedidos anteriores.
          </p>
        )}
        <p className="text-sm text-gray-600 text-center mb-8">
          {mode === "login"
            ? "Ingresa a tu cuenta para continuar"
            : ""}
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

        {/* Banner de verificación de email */}
        {userEmail && isEmailVerified !== null && (
          <EmailVerificationBanner
            email={userEmail}
            isVerified={isEmailVerified}
          />
        )}

        {/* Banner de correo verificado */}
        {searchParams?.get("verified") === "1" && (
          <AccountInfoBanner showVerified={true} />
        )}

        {/* Bloque de puntos de lealtad */}
        {userEmail && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight mb-4 text-gray-900">
              Mis puntos de lealtad
            </h2>
            {loyaltyLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-blue-100 rounded animate-pulse"></div>
                <div className="h-4 bg-blue-100 rounded animate-pulse w-3/4"></div>
              </div>
            ) : loyaltyPoints !== null ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Puntos actuales:</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {loyaltyPoints.pointsBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Puntos acumulados:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {loyaltyPoints.lifetimeEarned.toLocaleString()}
                  </span>
                </div>
                <div className="pt-3 border-t border-blue-200">
                  <p className="text-sm text-gray-600">
                    Cada $1 MXN que pagas en tus pedidos genera puntos de lealtad. Al llegar al mínimo, puedes usarlos como descuento en tu siguiente compra.
                  </p>
                  {loyaltyPoints.canApplyDiscount ? (
                    <p className="text-sm font-medium text-green-700 mt-2">
                      Ya puedes usar tu {LOYALTY_DISCOUNT_PERCENT}% de descuento en tu próxima compra.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 mt-2">
                      Te faltan <strong>{(LOYALTY_MIN_POINTS_FOR_DISCOUNT - loyaltyPoints.pointsBalance).toLocaleString()}</strong> puntos para poder usar el {LOYALTY_DISCOUNT_PERCENT}% de descuento.
                    </p>
                  )}
                </div>
                <Link
                  href="/cuenta/pedidos"
                  className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Ver mis pedidos
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Puntos actuales:</span>
                  <span className="text-2xl font-bold text-gray-400">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Puntos acumulados:</span>
                  <span className="text-lg font-semibold text-gray-400">0</span>
                </div>
                <div className="pt-3 border-t border-blue-200">
                  <p className="text-sm text-gray-600">
                    Todavía no has acumulado puntos. Compra con este correo para empezar a acumular.
                  </p>
                </div>
                <Link
                  href="/cuenta/pedidos"
                  className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Ver mis pedidos
                </Link>
              </div>
            )}
          </div>
        )}

        {!userEmail && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              Mis puntos de lealtad
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Ingresa o busca tus pedidos para ver tus puntos disponibles.
            </p>
            <Link
              href="/cuenta/pedidos"
              className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              Ver mis pedidos
            </Link>
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
              autoComplete="email"
            />
            {mode === "login" && (
              <p className="text-xs text-gray-500 mt-1">
                Si no ves el correo de verificación, revisa tu carpeta de spam.
              </p>
            )}
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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
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
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary disabled:opacity-50"
          >
            {(() => {
              if (isLoading) return "Procesando...";
              if (mode === "login") return "Iniciar Sesión";
              return "Crear Cuenta";
            })()}
          </button>
          {mode === "register" && (
            <p className="text-[11px] text-gray-500 mt-3 text-center">
              Al crear tu cuenta aceptas el{" "}
              <Link
                href="/contrato-de-compra"
                className="underline underline-offset-2 text-blue-600 hover:text-blue-700"
              >
                contrato de compra
              </Link>{" "}
              y el{" "}
              <Link
                href="/aviso-de-privacidad"
                className="underline underline-offset-2 text-blue-600 hover:text-blue-700"
              >
                aviso de privacidad
              </Link>
              .
            </p>
          )}
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

