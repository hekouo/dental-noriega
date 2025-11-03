"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import {
  useCheckoutStore,
  type ShippingMethod,
} from "@/lib/store/checkoutStore";
import { useCartStore } from "@/lib/store/cartStore";
import {
  useSelectedTotal,
  useSelectedItems,
} from "@/lib/store/checkoutSelectors";
import { formatMXN } from "@/lib/utils/currency";
import CheckoutStepIndicator from "@/components/CheckoutStepIndicator";
import CheckoutDebugPanel from "@/components/CheckoutDebugPanel";
import { cpToZone, quote } from "@/lib/shipping/config";
import { cartKg } from "@/lib/shipping/weights";
import { track } from "@/lib/analytics";

type FormValues = {
  paymentMethod: string;
  honorific: string;
  shippingMethod: ShippingMethod;
};

function makeOrderRef() {
  // referencia legible tipo DDN-202511-ABC123
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const d = new Date();
  return `DDN-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${rand}`;
}

async function createMockOrder(payload: unknown) {
  // POST opcional a /api/orders/mock si ya existe; si no, simula con Promise
  try {
    const response = await fetch("/api/orders/mock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn("[createMockOrder] Error en API, usando mock local:", error);
  }
  // Simula con Promise si no hay API o falla
  await new Promise((r) => setTimeout(r, 300));
  return { success: true, orderId: `mock-${Date.now()}` };
}

export default function PagoClient() {
  const router = useRouter();
  const datos = useCheckoutStore((s) => s.datos);
  const resetCheckout = useCheckoutStore((s) => s.reset);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = useSelectedTotal();
  const selectedItems = useSelectedItems();
  const setShipping = useCheckoutStore((s) => s.setShipping);
  const currentShippingMethod = useCheckoutStore((s) => s.shippingMethod);

  const [error, setError] = useState<string | null>(null);

  // Calcular envío basado en CP y peso
  const shippingData = useMemo(() => {
    if (!datos?.cp || !selectedItems.length) {
      // Fallback a tarifas fijas
      return {
        zone: null as "metro" | "nacional" | null,
        kg: 0,
        prices: {
          pickup: 0,
          standard: 99,
          express: 179,
        },
      };
    }

    const zone = cpToZone(datos.cp);
    const kg = cartKg(selectedItems);
    const prices = quote(zone, kg);

    return {
      zone,
      kg,
      prices: {
        pickup: 0,
        standard: prices.standard,
        express: prices.express,
      },
    };
  }, [datos?.cp, selectedItems]);

  // Inicializar método de envío si no está seleccionado
  useEffect(() => {
    if (!currentShippingMethod && datos?.cp) {
      setShipping("pickup", 0);
    }
  }, [currentShippingMethod, datos?.cp, setShipping]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      paymentMethod: "",
      honorific: "Dr.",
      shippingMethod: currentShippingMethod || "pickup",
    },
  });

  const selectedShippingMethod = watch("shippingMethod") as ShippingMethod;
  const shippingCost = shippingData.prices[selectedShippingMethod] || 0;
  const total = subtotal + shippingCost;

  // Actualizar store cuando cambia el método de envío
  useEffect(() => {
    if (selectedShippingMethod) {
      setShipping(selectedShippingMethod, shippingCost);

      // Analytics: add_shipping_info
      if (selectedShippingMethod !== "pickup") {
        track("add_shipping_info", {
          shipping_tier: selectedShippingMethod,
          value: total,
          shipping: shippingCost,
        });
      }
    }
  }, [selectedShippingMethod, shippingCost, total, setShipping]);

  const handlePayNow = async () => {
    try {
      const orderRef = makeOrderRef();
      await createMockOrder({ datos, items: selectedItems, orderRef });

      // Guardar en sessionStorage
      const lastOrder = {
        orderRef,
        total,
        shippingMethod: selectedShippingMethod,
        shippingCost,
      };
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ddn_last_order", JSON.stringify(lastOrder));
      }

      // Analytics: purchase
      track("purchase", {
        value: total,
        currency: "MXN",
        shipping: shippingCost,
        items: selectedItems.map((item) => ({
          id: item.id,
          name: item.title,
          price: item.price,
          qty: item.qty,
        })),
      });

      clearCart();
      resetCheckout();
      router.push(`/checkout/gracias?orden=${encodeURIComponent(orderRef)}`);
    } catch (e) {
      console.error("payNow error", e);
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo procesar el pago. Intenta de nuevo.",
      );
    }
  };

  if (!datos) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CheckoutStepIndicator currentStep="pago" />

      <h1 className="text-2xl font-bold mb-6">Confirmar Pago</h1>

      {/* Resumen de envío compacto */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-semibold text-sm text-gray-700 mb-1">
              Datos de envío
            </h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>
                  {datos.name} {datos.last_name}
                </strong>
              </p>
              <p>{datos.phone}</p>
              <p className="mt-2">
                {datos.address}
                <br />
                {datos.neighborhood}, {datos.city}, {datos.state} {datos.cp}
              </p>
            </div>
          </div>
          <Link
            href="/checkout/datos"
            className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 underline"
          >
            Editar datos
          </Link>
        </div>
      </div>

      {/* Método de envío */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-3 text-sm text-gray-700">
          Método de envío *
        </h2>
        <div className="space-y-2">
          <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-100">
            <input
              type="radio"
              value="pickup"
              {...register("shippingMethod", {
                required: "Selecciona un método de envío",
              })}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">Recoger en tienda</div>
              <div className="text-sm text-gray-600">Gratis</div>
            </div>
            <div className="font-semibold">{formatMXN(0)}</div>
          </label>

          <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-100">
            <input
              type="radio"
              value="standard"
              {...register("shippingMethod", {
                required: "Selecciona un método de envío",
              })}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">Estándar</div>
              <div className="text-sm text-gray-600">
                {shippingData.zone
                  ? `Zona ${shippingData.zone} • ${shippingData.kg.toFixed(1)} kg`
                  : "Envío estándar"}
              </div>
            </div>
            <div className="font-semibold">
              {formatMXN(shippingData.prices.standard)}
            </div>
          </label>

          <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-100">
            <input
              type="radio"
              value="express"
              {...register("shippingMethod", {
                required: "Selecciona un método de envío",
              })}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">Express</div>
              <div className="text-sm text-gray-600">
                {shippingData.zone
                  ? `Zona ${shippingData.zone} • ${shippingData.kg.toFixed(1)} kg`
                  : "Entrega rápida"}
              </div>
            </div>
            <div className="font-semibold">
              {formatMXN(shippingData.prices.express)}
            </div>
          </label>
        </div>
        {errors.shippingMethod && (
          <p className="text-red-500 text-sm mt-2">
            {errors.shippingMethod.message}
          </p>
        )}
      </div>

      {/* Resumen de productos */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2 text-sm text-gray-700">
          Productos seleccionados:
        </h2>
        <ul className="space-y-1">
          {selectedItems.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>{item.title}</span>
              <span>
                {formatMXN(item.price)} x{item.qty}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatMXN(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Envío:</span>
            <span>
              {selectedShippingMethod === "pickup"
                ? "Gratis"
                : formatMXN(shippingCost)}
            </span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t">
            <span>Total:</span>
            <span>{formatMXN(total)}</span>
          </div>
        </div>
      </div>

      {/* Formulario de pago */}
      <form onSubmit={handleSubmit(handlePayNow)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tratamiento *
          </label>
          <select
            {...register("honorific", {
              required: "El tratamiento es requerido",
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="Dr.">Dr.</option>
            <option value="Dra.">Dra.</option>
          </select>
          {errors.honorific && (
            <p className="text-red-500 text-sm mt-1">
              {errors.honorific.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Método de pago *
          </label>
          <select
            {...register("paymentMethod", {
              required: "Selecciona un método de pago",
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecciona...</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="tarjeta">Tarjeta de crédito/débito</option>
          </select>
          {errors.paymentMethod && (
            <p className="text-red-500 text-sm mt-1">
              {errors.paymentMethod.message}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <Link
            href="/checkout/datos"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Volver a datos
          </Link>
          <button
            type="submit"
            onClick={handlePayNow}
            data-testid="btn-pagar-ahora"
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex-1"
          >
            Pagar ahora - {formatMXN(total)}
          </button>
        </div>
      </form>
      <CheckoutDebugPanel />
    </div>
  );
}
