"use client";

import React from "react";
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
import { formatMXN as formatMXNMoney } from "@/lib/utils/money";
import CheckoutStepIndicator from "@/components/CheckoutStepIndicator";
import CheckoutDebugPanel from "@/components/CheckoutDebugPanel";
import { cpToZone, quote } from "@/lib/shipping/config";
import { cartKg } from "@/lib/shipping/weights";
import { track } from "@/lib/analytics";
import { validateCoupon } from "@/lib/discounts/coupons";
import { setWithTTL, KEYS, TTL_48H } from "@/lib/utils/persist";
import Toast from "@/components/ui/Toast";

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
  const couponCode = useCheckoutStore((s) => s.couponCode);
  const discount = useCheckoutStore((s) => s.discount);
  const discountScope = useCheckoutStore((s) => s.discountScope);
  const lastAppliedCoupon = useCheckoutStore((s) => s.lastAppliedCoupon);
  const setCoupon = useCheckoutStore((s) => s.setCoupon);
  const clearCoupon = useCheckoutStore((s) => s.clearCoupon);

  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success";
  } | null>(null);

  // Restaurar último cupón aplicado si existe
  useEffect(() => {
    if (lastAppliedCoupon && !couponCode && !couponInput) {
      setCouponInput(lastAppliedCoupon);
    }
  }, [lastAppliedCoupon, couponCode, couponInput]);

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

  // Calcular totales con cupón
  const total = useMemo(() => {
    let calculated = subtotal + shippingCost;

    if (discount && discountScope) {
      if (discountScope === "subtotal") {
        calculated = subtotal - discount + shippingCost;
      } else if (discountScope === "shipping") {
        calculated = subtotal + Math.max(0, shippingCost - discount);
      }
    }

    return Math.max(0, calculated);
  }, [subtotal, shippingCost, discount, discountScope]);

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

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError("Ingresa un código de descuento");
      return;
    }

    const validation = validateCoupon(code, {
      subtotal,
      shipping: shippingCost,
      items: selectedItems.map((item) => ({
        section: (item as any).section,
        price: item.price,
        qty: item.qty,
      })),
    });

    if (!validation.ok) {
      const errorMsg = validation.reason || "Cupón no válido";
      setCouponError(errorMsg);
      setToast({ message: errorMsg, type: "error" });
      return;
    }

    setCoupon(validation.appliedCode!, validation.discount, validation.scope);
    setCouponError(null);
    setCouponInput("");

    // Analytics
    track("apply_coupon", {
      code: validation.appliedCode,
      scope: validation.scope,
      discount: validation.discount,
    });
  };

  const handleCouponBlur = () => {
    if (couponInput.trim() && !couponCode) {
      handleApplyCoupon();
    }
  };

  const handleCouponKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyCoupon();
    }
  };

  const handlePayNow = async () => {
    try {
      const orderRef = makeOrderRef();
      await createMockOrder({ datos, items: selectedItems, orderRef });

      // Guardar última orden en persist.ts
      const lastOrder = {
        orderRef,
        total,
        shippingMethod: selectedShippingMethod,
        shippingCost,
        items: selectedItems.map((item) => {
          const section =
            (item as any).section ??
            (item as any).product?.section ??
            "consumibles-y-profilaxis";
          const slug =
            (item as any).product_slug ??
            (item as any).slug ??
            (item as any).product?.slug ??
            "";
          if (!slug) {
            console.warn("[PagoClient] Missing slug in lastOrder item", item);
          }
          return {
            section,
            slug,
            title: item.title,
            price: item.price,
            qty: item.qty,
          };
        }),
      };
      setWithTTL(KEYS.LAST_ORDER, lastOrder, TTL_48H);

      // Analytics: purchase
      track("purchase", {
        value: total,
        currency: "MXN",
        shipping: shippingCost,
        coupon: couponCode || undefined,
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

      {/* Botón Volver al carrito */}
      <div className="mb-4">
        <Link
          href="/carrito"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Volver al carrito
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Confirmar Pago</h1>
      <p className="text-gray-600 mb-6">
        Revisa tu información y completa tu pedido
      </p>

      {/* Toast para notificaciones */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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
            <div className="font-semibold">{formatMXNMoney(0)}</div>
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
              {formatMXNMoney(shippingData.prices.standard)}
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
              {formatMXNMoney(shippingData.prices.express)}
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
                {formatMXNMoney(item.price)} x{item.qty}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatMXNMoney(subtotal)}</span>
          </div>
          {discount && discountScope && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento {couponCode ? `(${couponCode})` : ""}:</span>
              <span>-{formatMXNMoney(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>Envío:</span>
            <span>
              {selectedShippingMethod === "pickup"
                ? "Gratis"
                : formatMXNMoney(shippingCost)}
            </span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t">
            <span>Total:</span>
            <span>{formatMXNMoney(total)}</span>
          </div>
        </div>
      </div>

      {/* Código de descuento */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-3 text-sm text-gray-700">
          Código de descuento
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponInput}
            onChange={(e) => {
              setCouponInput(e.target.value);
              setCouponError(null);
            }}
            onBlur={handleCouponBlur}
            onKeyDown={handleCouponKeyDown}
            placeholder="Ingresa tu código"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={!!couponCode}
            aria-label="Código de descuento"
            aria-describedby={
              couponError
                ? "coupon-error"
                : couponCode
                  ? "coupon-success"
                  : undefined
            }
          />
          {couponCode ? (
            <button
              type="button"
              onClick={() => {
                clearCoupon();
                setCouponInput("");
                setCouponError(null);
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Quitar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyCoupon}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
            >
              Aplicar
            </button>
          )}
        </div>
        {couponError && (
          <p
            id="coupon-error"
            className="text-red-500 text-sm mt-2"
            role="alert"
          >
            {couponError}
          </p>
        )}
        {couponCode && !couponError && (
          <p id="coupon-success" className="text-green-600 text-sm mt-2">
            ✓ Cupón {couponCode} aplicado
          </p>
        )}
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
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            ← Volver a datos
          </Link>
          <button
            type="submit"
            onClick={handlePayNow}
            data-testid="btn-pagar-ahora"
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex-1 transition-colors font-semibold"
          >
            Pagar ahora - {formatMXNMoney(total)}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Al continuar, aceptas nuestros{" "}
          <Link
            href="/terminos-condiciones"
            className="text-primary-600 underline hover:text-primary-700"
          >
            términos y condiciones
          </Link>{" "}
          y{" "}
          <Link
            href="/aviso-privacidad"
            className="text-primary-600 underline hover:text-primary-700"
          >
            aviso de privacidad
          </Link>
          .
        </p>
      </form>
      <CheckoutDebugPanel />
    </div>
  );
}
