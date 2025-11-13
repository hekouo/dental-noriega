"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatMXN } from "@/lib/utils/currency";
import { stripePromise } from "@/lib/stripe/stripeClient";

type StripePaymentFormProps = {
  orderId?: string;
  totalCents: number;
  onSuccess?: (orderId: string) => void;
  onError?: (error: string) => void;
};

function InnerForm({ effectiveOrderId }: { effectiveOrderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dental-noriega.vercel.app");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

      // return_url debe incluir el orderId
      const returnUrl = `${runtimeOrigin}/checkout/gracias?order=${encodeURIComponent(effectiveOrderId)}`;
      
      // Confirmar pago con return_url que incluye orderId
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: "if_required",
      });

      if (result?.error) {
        setError(result.error.message ?? "Error al procesar el pago");
        setIsProcessing(false);
        return;
      }

      const pi = result.paymentIntent;
      
      // Fallback a push manual si no hubo redirect
      if (pi?.status === "succeeded" || pi?.status === "processing" || pi?.status === "requires_capture") {
        const status = pi.status === "succeeded" ? "succeeded" : pi.status === "processing" ? "processing" : "requires_capture";
        router.push(`/checkout/gracias?order=${encodeURIComponent(effectiveOrderId)}&redirect_status=${status}`);
        return;
      }

      // Si Stripe ya redirigió, no hacemos nada
      // Si quedó en requires_action, Stripe hará modal/redirect automáticamente
      setIsProcessing(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error inesperado";
      setError(errorMessage);
      setIsProcessing(false);
    }
  }

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
          Total: {formatMXN(0)} {/* Total se muestra en PagoClient */}
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
  orderId: propsOrderId,
  totalCents,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const sp = useSearchParams();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Resolver orderId: props > query > localStorage
  const effectiveOrderId =
    propsOrderId ||
    sp?.get("order") ||
    (typeof window !== "undefined" ? localStorage.getItem("DDN_LAST_ORDER_V1") || undefined : undefined);

  // Persistir orderId en localStorage cuando esté disponible
  useEffect(() => {
    if (!effectiveOrderId) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("DDN_LAST_ORDER_V1", effectiveOrderId);
    }
  }, [effectiveOrderId]);

  // Llamar a /api/stripe/create-payment-intent una sola vez
  useEffect(() => {
    async function run() {
      if (!effectiveOrderId) return;

      try {
        const res = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: effectiveOrderId }),
        });

        if (!res.ok) {
          throw new Error(`Error al crear PaymentIntent: ${res.status}`);
        }

        const data = await res.json();
        setClientSecret(data.client_secret ?? null);
      } catch (err) {
        if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
          console.error("[StripePaymentForm] Error al crear PaymentIntent:", err);
        }
        onError?.(err instanceof Error ? err.message : "Error al crear PaymentIntent");
      }
    }

    run();
  }, [effectiveOrderId, onError]);

  const options = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: "stripe" as const,
            },
          }
        : undefined,
    [clientSecret]
  );

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        Stripe no está configurado. Configura NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        en tus variables de entorno.
      </div>
    );
  }

  if (!effectiveOrderId) {
    return null; // Esperar orderId
  }

  if (!clientSecret) {
    return (
      <div className="bg-gray-50 text-gray-600 p-4 rounded-lg">
        Cargando formulario de pago...
      </div>
    );
  }

  // Elements se monta UNA sola vez y solo cuando hay clientSecret
  return (
    <Elements stripe={stripePromise} options={options}>
      <InnerForm effectiveOrderId={effectiveOrderId} />
    </Elements>
  );
}

