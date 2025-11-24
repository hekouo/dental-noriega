"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import Toast from "@/components/ui/Toast";

type EmailVerificationBannerProps = {
  email: string;
  isVerified: boolean;
};

export default function EmailVerificationBanner({
  email,
  isVerified,
}: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  if (isVerified) {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    try {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        throw new Error("Supabase no disponible");
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        throw error;
      }

      setToast({
        message: "Correo de verificación reenviado.",
        type: "success",
      });
    } catch (err) {
      console.error("[EmailVerificationBanner] Error al reenviar correo:", err);
      setToast({
        message: "No se pudo reenviar el correo. Intenta más tarde.",
        type: "error",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-800 mb-1">
              Confirma tu correo para activar tu cuenta
            </h3>
            <p className="text-sm text-yellow-700 mb-3">
              Te enviamos un correo a <strong>{email}</strong>. Revisa tu
              bandeja de entrada y el spam.
            </p>
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? "Enviando…" : "Reenviar correo de verificación"}
            </button>
          </div>
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={5000}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

