"use client";

import { useState, useTransition } from "react";
import { resendBankTransferInstructionsAdmin } from "@/lib/actions/shipping.admin";

type Props = {
  orderId: string;
};

export default function ResendPaymentInstructionsClient({ orderId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleResend = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await resendBankTransferInstructionsAdmin(orderId);

        if (result.ok) {
          setMessage({
            type: "success",
            text: "Instrucciones reenviadas al correo del cliente.",
          });
        } else {
          let errorText = "No se pudo enviar el correo. Revisa la configuración de email.";
          if (result.error === "no_email") {
            errorText = "No se encontró un correo electrónico para esta orden.";
          } else if (result.error === "email_disabled") {
            errorText = "El envío de correos está deshabilitado en este entorno.";
          } else if (result.error === "invalid_payment_method") {
            errorText = "Esta orden no es de transferencia bancaria.";
          } else if (result.error === "order_not_found") {
            errorText = "Orden no encontrada.";
          } else if (result.error === "unauthorized") {
            errorText = "No tienes permisos para realizar esta acción.";
          }
          setMessage({
            type: "error",
            text: errorText,
          });
        }
      } catch {
        setMessage({
          type: "error",
          text: "Error inesperado al reenviar instrucciones.",
        });
      }
    });
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleResend}
        disabled={isPending}
        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Enviando..." : "Reenviar instrucciones de pago"}
      </button>
      {message && (
        <div
          className={`mt-2 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

