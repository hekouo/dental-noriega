"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useRouter } from "next/navigation";
import { Truck, Store } from "lucide-react";

export default function CheckoutPage() {
  const [method, setMethod] = useState<"shipping" | "pickup">("shipping");
  const router = useRouter();

  const handleContinue = () => {
    localStorage.setItem("checkout_method", method);
    router.push("/checkout/datos");
  };

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Método de Entrega</h1>
          <p className="text-gray-600">Elige cómo quieres recibir tu pedido</p>
        </div>

        <div className="space-y-4 mb-8">
          <button
            onClick={() => setMethod("shipping")}
            className={`w-full p-6 rounded-lg border-2 transition-all ${
              method === "shipping"
                ? "border-primary-600 bg-primary-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-full ${
                  method === "shipping"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100"
                }`}
              >
                <Truck size={24} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-lg mb-1">
                  Entrega a domicilio
                </h3>
                <p className="text-gray-600 text-sm">
                  Recibe tu pedido en la dirección que elijas
                </p>
                <p className="text-sm text-primary-600 mt-2">
                  Envío: $150 MXN (Gratis en compras mayores a $2,000)
                </p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  method === "shipping"
                    ? "border-primary-600"
                    : "border-gray-300"
                }`}
              >
                {method === "shipping" && (
                  <div className="w-3 h-3 rounded-full bg-primary-600" />
                )}
              </div>
            </div>
          </button>

          <button
            onClick={() => setMethod("pickup")}
            className={`w-full p-6 rounded-lg border-2 transition-all ${
              method === "pickup"
                ? "border-primary-600 bg-primary-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-full ${
                  method === "pickup"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100"
                }`}
              >
                <Store size={24} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-lg mb-1">
                  Recoger en tienda
                </h3>
                <p className="text-gray-600 text-sm">
                  Recoge tu pedido en nuestra sucursal
                </p>
                <p className="text-sm text-primary-600 mt-2">
                  Sin costo de envío
                </p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  method === "pickup" ? "border-primary-600" : "border-gray-300"
                }`}
              >
                {method === "pickup" && (
                  <div className="w-3 h-3 rounded-full bg-primary-600" />
                )}
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={handleContinue}
          className="w-full btn btn-primary text-lg"
        >
          Continuar
        </button>
      </div>
    </AuthGuard>
  );
}
