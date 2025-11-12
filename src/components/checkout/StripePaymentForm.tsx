"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatMXN } from "@/lib/utils/currency";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

type StripePaymentFormProps = {
  clientSecret: string;
  orderId: string;
  totalCents: number;
  onSuccess?: (orderId: string) => void;
  onError?: (error: string) => void;
};

function PaymentForm({
  orderId: propsOrderId,
  totalCents,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener orderId de múltiples fuentes: prop > query > localStorage
  const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dental-noriega.vercel.app");
  const norm = (s: string) => encodeURIComponent(s);

  // Asegurar orderId: prop > query > localStorage
  let effectiveOrderId: string | null = propsOrderId ?? sp?.get("order") ?? null;
  if (!effectiveOrderId && typeof window !== "undefined") {
    const stored = localStorage.getItem("ddn_last_order");
    effectiveOrderId = stored || null;
  }
  if (effectiveOrderId && typeof window !== "undefined") {
    localStorage.setItem("ddn_last_order", String(effectiveOrderId));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe no está listo. Intenta recargar la página.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Submit del formulario primero
      await elements.submit();

      const finalOrderId = String(effectiveOrderId ?? "");
      
      // Confirmar pago con return_url que incluye orderId
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${runtimeOrigin}/checkout/gracias?order=${norm(finalOrderId)}`,
        },
        redirect: "if_required",
      });

      if (result?.error) {
        setError(result.error.message ?? "Error al procesar el pago");
        onError?.(result.error.message ?? "Error al procesar el pago");
        setIsProcessing(false);
        return;
      }

      const pi = result.paymentIntent;
      
      // Manejar estados exitosos: succeeded, processing, requires_capture
      // Algunos métodos (Link/guardada) no redirigen automáticamente, hacemos push manual
      if (pi?.status === "succeeded" || pi?.status === "processing" || pi?.status === "requires_capture") {
        const status = pi.status === "succeeded" ? "succeeded" : pi.status === "processing" ? "processing" : "requires_capture";
        onSuccess?.(finalOrderId);
        router.push(`/checkout/gracias?order=${norm(finalOrderId)}&redirect_status=${status}`);
        return;
      }

      // Si Stripe ya redirigió, no hacemos nada
      // Si quedó en requires_action, Stripe hará modal/redirect automáticamente
      setIsProcessing(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error inesperado";
      setError(errorMessage);
      onError?.(errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg p-4 border">
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-lg font-semibold">
          Total: {formatMXN(totalCents / 100)}
        </div>
        <button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? "Procesando..." : "Confirmar Pago"}
        </button>
      </div>
    </form>
  );
}

export default function StripePaymentForm({
  clientSecret,
  orderId,
  totalCents,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        Stripe no está configurado. Configura NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        en tus variables de entorno.
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="bg-gray-50 text-gray-600 p-4 rounded-lg">
        Cargando formulario de pago...
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
        },
      }}
    >
      <PaymentForm
        clientSecret={clientSecret}
        orderId={orderId}
        totalCents={totalCents}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}

