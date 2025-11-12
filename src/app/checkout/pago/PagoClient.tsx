"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import {
  useCheckoutStore,
  type ShippingMethod,
  type CheckoutItem,
} from "@/lib/store/checkoutStore";
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
import Toast from "@/components/ui/Toast";
import type { DatosForm } from "@/lib/checkout/schemas";
import StripePaymentForm from "@/components/checkout/StripePaymentForm";
import { getBrowserSupabase } from "@/lib/supabase/client";

type FormValues = {
  paymentMethod: string;
  honorific: string;
  shippingMethod: ShippingMethod;
};

// Tipo extendido para items del checkout que pueden tener propiedades adicionales
type ExtendedCheckoutItem = CheckoutItem & {
  section?: string;
  product_slug?: string;
  slug?: string;
  product?: {
    section?: string;
    slug?: string;
  };
};

// Tipo extendido para datos de checkout que pueden tener notas
type ExtendedDatosForm = DatosForm & {
  notes?: string;
};

export default function PagoClient() {
  const router = useRouter();
  const datos = useCheckoutStore((s) => s.datos);
  const resetCheckout = useCheckoutStore((s) => s.reset);
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
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

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
  const selectedPaymentMethod = watch("paymentMethod");
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

  // Helper para obtener section de un item
  const getItemSection = (item: CheckoutItem): string => {
    const extended = item as ExtendedCheckoutItem;
    return extended.section ?? extended.product?.section ?? "consumibles-y-profilaxis";
  };

  // Helper para obtener slug de un item
  const getItemSlug = (item: CheckoutItem): string => {
    const extended = item as ExtendedCheckoutItem;
    return extended.product_slug ?? extended.slug ?? extended.product?.slug ?? "";
  };

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
        section: getItemSection(item),
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

  // Crear orden y generar PaymentIntent si es tarjeta
  const handleCreateOrderAndPaymentIntent = async (formData?: FormValues) => {
    if (!datos) {
      setError("Faltan datos de envío");
      return;
    }

    // Validar carrito no vacío
    if (selectedItems.length === 0) {
      setError("El carrito está vacío");
      router.push("/catalogo");
      return;
    }

    // Obtener método de pago del formulario o del watch
    const paymentMethod = formData?.paymentMethod || watch("paymentMethod") || "";

    // Validar que no haya items con precio 0 si es tarjeta
    if (paymentMethod === "tarjeta") {
      const hasZeroPrice = selectedItems.some((item) => item.price <= 0);
      if (hasZeroPrice) {
        setError("No se puede procesar pago con tarjeta para productos sin precio. Usa otro método de pago o contacta para consultar precio.");
        setToast({ message: "Algunos productos requieren consultar precio", type: "error" });
        return;
      }
    }

    setIsCreatingOrder(true);
    setError(null);

    try {
      // Obtener user_id si hay sesión
      let userId: string | undefined;
      try {
        const supabase = getBrowserSupabase();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id;
        }
      } catch {
        // Continuar como guest si no hay sesión
      }

      // Crear orden primero
      const orderPayload = {
        items: selectedItems.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          qty: item.qty,
        })),
        total_cents: Math.round(total * 100),
        ...(userId && { user_id: userId }),
      };

      const orderResponse = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error || `Error al crear la orden: ${orderResponse.status}`,
        );
      }

      const orderResult = await orderResponse.json();
      const newOrderId = (orderResult as { order_id?: string }).order_id;
      const amountCents = (orderResult as { total_cents?: number }).total_cents ?? Math.round(total * 100);

      if (!newOrderId) {
        throw new Error("No se recibió order_id de la API");
      }

      setOrderId(newOrderId);

      // Si el método de pago es tarjeta, generar PaymentIntent
      if (paymentMethod === "tarjeta") {
        if (amountCents <= 0) {
          throw new Error("El total debe ser mayor a 0 para pagar con tarjeta");
        }

        const paymentResponse = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: newOrderId,
            total_cents: amountCents,
          }),
        });

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error || `Error al crear payment intent: ${paymentResponse.status}`,
          );
        }

        const paymentResult = await paymentResponse.json();
        const secret = (paymentResult as { client_secret?: string }).client_secret;

        if (!secret) {
          throw new Error("No se recibió client_secret de la API");
        }

        setClientSecret(secret);
      } else {
        // Para otros métodos de pago, usar flujo legacy y redirigir
        handlePayNowLegacy(newOrderId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error inesperado";
      setError(errorMessage);
      setToast({ message: errorMessage, type: "error" });
      setIsCreatingOrder(false);
    }
  };

  // Flujo legacy para métodos de pago no-tarjeta
  const handlePayNowLegacy = async (existingOrderId?: string) => {
    if (!datos) {
      setError("Faltan datos de envío");
      setIsCreatingOrder(false);
      return;
    }

    try {
      // Si ya tenemos orderId, solo redirigir
      // NO limpiar carrito aquí - se limpiará en /checkout/gracias cuando la orden sea 'paid'
      if (existingOrderId) {
        resetCheckout();
        router.push(`/checkout/gracias?order=${encodeURIComponent(existingOrderId)}`);
        return;
      }

      // Preparar datos para la API legacy
      const orderPayload = {
        items: selectedItems.map((item) => ({
          product_id: item.id,
          slug: getItemSlug(item),
          title: item.title,
          price_cents: Math.round(item.price * 100),
          qty: item.qty,
        })),
        shipping: {
          method: selectedShippingMethod,
          cost_cents: Math.round(shippingCost * 100),
        },
        datos: {
          nombre: datos.name,
          telefono: datos.phone,
          direccion: datos.address,
          colonia: datos.neighborhood,
          estado: datos.state,
          cp: datos.cp,
          notas: (datos as ExtendedDatosForm).notes || undefined,
        },
        coupon:
          couponCode && discount && discountScope
            ? {
                code: couponCode,
                discount_cents: Math.round(discount * 100),
                scope: discountScope,
              }
            : undefined,
        totals: {
          subtotal_cents: Math.round(subtotal * 100),
          shipping_cents: Math.round(shippingCost * 100),
          total_cents: Math.round(total * 100),
        },
      };

      // Llamar a la API real
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error || `Error al crear la orden: ${response.status}`,
        );
      }

      const result = await response.json();
      const orderRef = (result as { order_ref?: string }).order_ref;

      if (!orderRef) {
        throw new Error("No se recibió order_ref de la API");
      }

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

      // NO limpiar carrito aquí - se limpiará en /checkout/gracias cuando la orden sea 'paid'
      resetCheckout();
      router.push(`/checkout/gracias?orden=${encodeURIComponent(orderRef)}`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "No se pudo procesar el pago. Intenta de nuevo.";
      setError(errorMessage);
      setToast({ message: errorMessage, type: "error" });
    } finally {
      setIsCreatingOrder(false);
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

      {/* Validación de carrito vacío */}
      {selectedItems.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 mb-4">Tu carrito está vacío</p>
          <Link
            href="/catalogo"
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Ir al Catálogo
          </Link>
        </div>
      )}

      {/* Stripe Payment Form si es tarjeta y tenemos clientSecret */}
      {selectedPaymentMethod === "tarjeta" && clientSecret && orderId ? (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h2 className="font-semibold mb-2 text-sm text-gray-700">Resumen de pago</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatMXNMoney(subtotal)}</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span>{formatMXNMoney(shippingCost)}</span>
                </div>
              )}
              {discount && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento:</span>
                  <span>-{formatMXNMoney(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total:</span>
                <span>{formatMXNMoney(total)}</span>
              </div>
            </div>
          </div>
          <StripePaymentForm
            clientSecret={clientSecret}
            orderId={orderId}
            totalCents={Math.round(total * 100)}
            onSuccess={(orderId) => {
              // NO limpiar carrito aquí - se limpiará en /checkout/gracias cuando la orden sea 'paid'
              resetCheckout();
              router.push(`/checkout/gracias?order=${encodeURIComponent(orderId)}`);
            }}
            onError={(errorMsg) => {
              setError(errorMsg);
              setToast({ message: errorMsg, type: "error" });
              setIsCreatingOrder(false);
              setClientSecret(null);
              setOrderId(null);
            }}
          />
        </div>
      ) : (
        /* Formulario de pago tradicional */
        <form onSubmit={handleSubmit(handleCreateOrderAndPaymentIntent)} className="space-y-4">
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
            <option value="tarjeta">Tarjeta de crédito/débito (Stripe)</option>
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
              disabled={
                isCreatingOrder ||
                selectedItems.length === 0 ||
                (selectedPaymentMethod === "tarjeta" && selectedItems.some((item) => item.price <= 0))
              }
            data-testid="btn-pagar-ahora"
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex-1 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
              {isCreatingOrder
                ? "Creando orden..."
                : selectedPaymentMethod === "tarjeta"
                  ? selectedItems.some((item) => item.price <= 0)
                    ? "Consultar precio (no disponible con tarjeta)"
                    : "Continuar con pago"
                  : `Pagar ahora - ${formatMXNMoney(total)}`}
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
      )}
      <CheckoutDebugPanel />
    </div>
  );
}
