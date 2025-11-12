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
  clientSecret,
  orderId,
  totalCents,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe no está listo. Intenta recargar la página.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: confirmError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/checkout/gracias`,
          },
          redirect: "if_required",
        });

      if (confirmError) {
        setError(confirmError.message ?? "Error al procesar el pago");
        onError?.(confirmError.message ?? "Error al procesar el pago");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // Usar orderId del prop, o intentar obtenerlo del metadata como fallback
        const metadataOrderId = (paymentIntent as { metadata?: { order_id?: string } }).metadata?.order_id;
        const finalOrderId = orderId || metadataOrderId;
        if (finalOrderId) {
          onSuccess?.(finalOrderId);
          router.push(`/checkout/gracias?order=${encodeURIComponent(finalOrderId)}`);
        } else {
          router.push("/checkout/gracias");
        }
      } else {
        setError("El pago no se completó correctamente");
        onError?.("El pago no se completó correctamente");
        setIsProcessing(false);
      }
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

