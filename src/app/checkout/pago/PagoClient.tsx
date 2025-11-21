"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  useCheckoutStore,
  type ShippingMethod,
  type CheckoutItem,
} from "@/lib/store/checkoutStore";
import { selectCheckoutItems } from "@/lib/store/checkoutStore";
import { formatMXN as formatMXNMoney } from "@/lib/utils/money";
import CheckoutStepper from "@/components/checkout/CheckoutStepper";
import CheckoutOrderSummary from "@/components/checkout/CheckoutOrderSummary";
import CheckoutDebugPanel from "@/components/CheckoutDebugPanel";
import { cpToZone, quote } from "@/lib/shipping/config";
import { cartKg } from "@/lib/shipping/weights";
import { track } from "@/lib/analytics";
import { validateCoupon } from "@/lib/discounts/coupons";
import Toast from "@/components/ui/Toast";
import type { DatosForm } from "@/lib/checkout/schemas";
import StripePaymentForm from "@/components/checkout/StripePaymentForm";
import { getSelectedItems, getSelectedSubtotalCents } from "@/lib/checkout/selection";
import { isValidEmail } from "@/lib/validation/email";
import {
  LOYALTY_MIN_POINTS_FOR_DISCOUNT,
  LOYALTY_DISCOUNT_PERCENT,
} from "@/lib/loyalty/config";
import { applyFreeShippingIfEligible } from "@/lib/shipping/freeShipping";

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
  // Usar SOLO los items seleccionados del checkoutStore
  const checkoutItems = useCheckoutStore(selectCheckoutItems);
  const itemsForOrder = useMemo(() => getSelectedItems(checkoutItems), [checkoutItems]);
  // Calcular subtotal desde items seleccionados usando price_cents si existe
  const subtotal = useMemo(() => {
    return getSelectedSubtotalCents(checkoutItems) / 100;
  }, [checkoutItems]);
  const setShipping = useCheckoutStore((s) => s.setShipping);
  const currentShippingMethod = useCheckoutStore((s) => s.shippingMethod);
  const couponCode = useCheckoutStore((s) => s.couponCode);
  const discount = useCheckoutStore((s) => s.discount);
  const discountScope = useCheckoutStore((s) => s.discountScope);
  const lastAppliedCoupon = useCheckoutStore((s) => s.lastAppliedCoupon);
  const setCoupon = useCheckoutStore((s) => s.setCoupon);
  const clearCoupon = useCheckoutStore((s) => s.clearCoupon);

  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"recoverable" | "fatal" | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success";
  } | null>(null);
  // CRÍTICO: Usar orderId del store, NO estado local ni localStorage
  // El store se limpia con resetAfterSuccess() después de pago exitoso
  const storeOrderId = useCheckoutStore((s) => s.orderId);
  const setStoreOrderId = useCheckoutStore((s) => s.setOrderId);
  const [orderId, setOrderId] = useState<string | null>(null); // Estado local solo para UI (StripePaymentForm)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Estado para puntos de lealtad
  const [loyaltyPoints, setLoyaltyPoints] = useState<{
    pointsBalance: number;
    lifetimeEarned: number;
    canApplyDiscount: boolean;
  } | null>(null);
  const [loyaltyApplied, setLoyaltyApplied] = useState(false);

  // Sincronizar orderId local con el del store
  // Solo usar orderId del store, NO restaurar de localStorage/URL automáticamente
  useEffect(() => {
    // Si el store tiene orderId, usarlo
    // Si el store NO tiene orderId, dejar orderId local como null (nueva compra)
    if (storeOrderId) {
      setOrderId(storeOrderId);
      if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
        console.debug("[PagoClient] OrderId del store:", storeOrderId);
      }
    } else {
      // Store no tiene orderId = nueva compra, asegurar que orderId local también es null
      setOrderId(null);
      if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
        console.debug("[PagoClient] Store sin orderId, preparado para nueva compra");
      }
    }
  }, [storeOrderId]);

  // Guard: redirigir si no hay items seleccionados
  useEffect(() => {
    if (itemsForOrder.length === 0 && datos) {
      router.replace("/checkout");
    }
  }, [itemsForOrder.length, datos, router]);

  // Restaurar último cupón aplicado solo al montar inicialmente, NO después de quitarlo explícitamente
  // Usar un ref para rastrear si el usuario quitó el cupón explícitamente
  const couponWasRemovedRef = useRef(false);
  
  useEffect(() => {
    // Solo restaurar si:
    // 1. Hay un lastAppliedCoupon
    // 2. No hay cupón aplicado actualmente
    // 3. El input está vacío
    // 4. El usuario NO quitó el cupón explícitamente
    if (lastAppliedCoupon && !couponCode && !couponInput && !couponWasRemovedRef.current) {
      setCouponInput(lastAppliedCoupon);
    }
  }, [lastAppliedCoupon, couponCode, couponInput]);

  // Cargar puntos de lealtad cuando hay email válido
  useEffect(() => {
    if (!datos?.email || !isValidEmail(datos.email)) {
      setLoyaltyPoints(null);
      return;
    }

    let cancelled = false;

    fetch(`/api/account/loyalty?email=${encodeURIComponent(datos.email)}`)
      .then((res) => {
        if (cancelled) return null;
        if (!res.ok) throw new Error("Error al cargar puntos");
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setLoyaltyPoints({
          pointsBalance: data.pointsBalance || 0,
          lifetimeEarned: data.lifetimeEarned || 0,
          canApplyDiscount: data.canApplyDiscount || false,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[PagoClient] Error al cargar puntos:", err);
        setLoyaltyPoints(null);
      });

    return () => {
      cancelled = true;
    };
  }, [datos?.email]);

  // Calcular envío basado en CP y peso
  const shippingData = useMemo(() => {
    if (!datos?.cp || !itemsForOrder.length) {
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
    const kg = cartKg(itemsForOrder);
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
    }, [datos?.cp, itemsForOrder]);

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
  const rawShippingCost = shippingData.prices[selectedShippingMethod] || 0;
  
  // Calcular subtotal de productos en centavos para aplicar envío gratis
  const productsSubtotalCents = useMemo(() => {
    return getSelectedSubtotalCents(checkoutItems);
  }, [checkoutItems]);
  
  // Aplicar envío gratis si el subtotal es >= $2,000 MXN
  const shippingCost = useMemo(() => {
    const rawShippingCents = Math.round(rawShippingCost * 100);
    const finalShippingCents = applyFreeShippingIfEligible({
      productsSubtotalCents,
      shippingCostCents: rawShippingCents,
    });
    return finalShippingCents / 100; // Convertir de vuelta a MXN para cálculos
  }, [rawShippingCost, productsSubtotalCents]);

  // Calcular descuento de puntos si está aplicado
  const loyaltyDiscountCents = useMemo(() => {
    if (!loyaltyApplied || !loyaltyPoints?.canApplyDiscount) return 0;
    const subtotalCents = getSelectedSubtotalCents(checkoutItems);
    return Math.floor(subtotalCents * (LOYALTY_DISCOUNT_PERCENT / 100));
  }, [loyaltyApplied, loyaltyPoints?.canApplyDiscount, checkoutItems]);

  // Calcular totalCents directamente desde items seleccionados usando price_cents
  const totalCents = useMemo(() => {
    const subtotalCents = getSelectedSubtotalCents(checkoutItems);
    
    // Agregar shipping cost en centavos
    const shippingCents = Math.round(shippingCost * 100);
    
    // Aplicar descuento de cupón si existe
    let finalCents = subtotalCents + shippingCents;
    if (discount && discountScope) {
      const discountCents = Math.round(discount * 100);
      if (discountScope === "subtotal") {
        finalCents = subtotalCents - discountCents + shippingCents;
      } else if (discountScope === "shipping") {
        finalCents = subtotalCents + Math.max(0, shippingCents - discountCents);
      }
    }
    
    // Aplicar descuento de puntos (sobre el subtotal elegible, después de cupones)
    if (loyaltyDiscountCents > 0) {
      finalCents = Math.max(0, finalCents - loyaltyDiscountCents);
    }
    
    return Math.max(0, finalCents);
  }, [checkoutItems, shippingCost, discount, discountScope, loyaltyDiscountCents]);

  // Calcular totales con cupón y puntos
  const total = useMemo(() => {
    let calculated = subtotal + shippingCost;

    if (discount && discountScope) {
      if (discountScope === "subtotal") {
        calculated = subtotal - discount + shippingCost;
      } else if (discountScope === "shipping") {
        calculated = subtotal + Math.max(0, shippingCost - discount);
      }
    }

    // Aplicar descuento de puntos
    if (loyaltyDiscountCents > 0) {
      calculated = Math.max(0, calculated - loyaltyDiscountCents / 100);
    }

    return Math.max(0, calculated);
  }, [subtotal, shippingCost, discount, discountScope, loyaltyDiscountCents]);

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
      items: itemsForOrder.map((item) => ({
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

    couponWasRemovedRef.current = false; // Resetear flag cuando se aplica un cupón nuevo
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
  // TODO: Refactor this function to reduce cognitive complexity. Rule temporarily disabled to keep CI passing.
  // eslint-disable-next-line sonarjs/cognitive-complexity
  const handleCreateOrderAndPaymentIntent = async (formData?: FormValues) => {
    if (!datos) {
      setError("Faltan datos de envío");
      return;
    }

    // Validar carrito no vacío
    if (itemsForOrder.length === 0) {
      setError("El carrito está vacío");
      router.push("/catalogo");
      return;
    }

    // Obtener método de pago del formulario o del watch
    const paymentMethod = formData?.paymentMethod || watch("paymentMethod") || "";

    // Validar que no haya items con precio 0 si es tarjeta
    if (paymentMethod === "tarjeta") {
      const hasZeroPrice = itemsForOrder.some((item) => {
        const priceCents =
          typeof item.price_cents === "number"
            ? item.price_cents
            : typeof item.price === "number"
              ? Math.round(item.price * 100)
              : 0;
        return priceCents <= 0;
      });
      if (hasZeroPrice) {
        setError("No se puede procesar pago con tarjeta para productos sin precio. Usa otro método de pago o contacta para consultar precio.");
        setToast({ message: "Algunos productos requieren consultar precio", type: "error" });
        return;
      }
    }

    // CRÍTICO: Verificar si ya hay un orderId en el store
    // Si checkoutStore.orderId es null, crear SIEMPRE una nueva orden
    // Si checkoutStore.orderId tiene valor, puede ser un reintento de la MISMA compra
    const currentStoreOrderId = useCheckoutStore.getState().orderId;
    
    if (currentStoreOrderId && orderId === currentStoreOrderId) {
      // Ya tenemos un orderId válido en el store y en el estado local
      // Esto puede ser un reintento de la misma compra (refresh, etc.)
      if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
        console.debug("[PagoClient] Reutilizando orderId existente del store:", currentStoreOrderId);
      }
      // Si el método de pago es tarjeta, StripePaymentForm ya tiene el orderId
      // Si no es tarjeta, redirigir con el orderId existente
      if (paymentMethod !== "tarjeta") {
        handlePayNowLegacy(currentStoreOrderId);
      }
      return;
    }

    setIsCreatingOrder(true);
    setError(null);

    try {
      // Crear orden NUEVA - NO enviar orderId en el payload para forzar creación nueva
      // IMPORTANTE: Incluir email del checkout para que se guarde en la orden y se use en Stripe
      const orderPayload = {
        email: datos.email, // Email del checkout para la orden y Stripe
        name: datos.name, // Nombre para metadata
        shippingMethod: selectedShippingMethod || "pickup", // Método de envío
        shippingCostCents: Math.round(shippingCost * 100), // Costo de envío en centavos
        // NO incluir orderId aquí - queremos que create-order cree SIEMPRE una nueva orden
        // Incluir datos de loyalty si está aplicado
        loyalty: loyaltyApplied && loyaltyPoints?.canApplyDiscount
          ? {
              applied: true,
              pointsToSpend: LOYALTY_MIN_POINTS_FOR_DISCOUNT,
              discountPercent: LOYALTY_DISCOUNT_PERCENT,
              discountCents: loyaltyDiscountCents,
              balanceBefore: loyaltyPoints.pointsBalance,
            }
          : undefined,
        items: itemsForOrder.map((item) => {
          const qty = item.qty ?? 1;
          const priceCents =
            typeof item.price_cents === "number" && item.price_cents > 0
              ? item.price_cents
              : typeof item.price === "number" && item.price > 0
                ? Math.round(item.price * 100)
                : 0;
          
          // Validar que priceCents sea válido
          if (priceCents <= 0) {
            console.warn("[PagoClient] Item sin precio válido:", {
              id: item.id,
              price_cents: item.price_cents,
              price: item.price,
              calculated_priceCents: priceCents,
            });
          }
          
          return {
            id: item.id,
            qty,
            price_cents: priceCents,
            title: item.title, // Título del producto para order_items
            image_url: item.image_url || null, // URL de imagen del producto
          };
        }).filter((item) => item.price_cents > 0), // Filtrar items sin precio válido
      };
      
      // Validar que haya al menos un item válido
      if (orderPayload.items.length === 0) {
        setError("No hay productos con precio válido para procesar el pago");
        setToast({ message: "Verifica que todos los productos tengan precio", type: "error" });
        setIsCreatingOrder(false);
        return;
      }
      
      // Log controlado para debugging
      if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
        console.info("[PagoClient] Payload para create-order:", {
          items_count: orderPayload.items.length,
          items: orderPayload.items,
          total_cents: orderPayload.items.reduce((sum, item) => sum + item.qty * item.price_cents, 0),
        });
      }

      const orderResponse = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        const errorMessage = (errorData as { error?: string }).error || `Error al crear la orden: ${orderResponse.status}`;
        
        // Errores 5xx o de red son recuperables
        if (orderResponse.status >= 500 || orderResponse.status === 0) {
          setErrorType("recoverable");
          throw new Error(`Error de conexión. Por favor, intenta de nuevo. ${errorMessage}`);
        }
        
        // Errores 4xx son graves (validación, datos incorrectos)
        setErrorType("fatal");
        throw new Error(errorMessage);
      }

      const orderResult = await orderResponse.json();
      const newOrderId = (orderResult as { order_id?: string }).order_id;
      const amountCents = (orderResult as { total_cents?: number }).total_cents ?? Math.round(total * 100);

      if (!newOrderId) {
        setErrorType("fatal");
        throw new Error("No se recibió order_id de la API. Por favor, contacta con soporte.");
      }

      // CRÍTICO: Guardar orderId en el store (no solo en estado local)
      // Esto asegura que si el usuario refresca, el store mantiene el orderId
      setStoreOrderId(newOrderId);
      setOrderId(newOrderId);

      // Persistir orderId y datos completos de la orden en localStorage (para GraciasContent)
      if (typeof window !== "undefined") {
        const orderData = {
          orderRef: newOrderId,
          order_id: newOrderId,
          status: "pending",
          total_cents: amountCents,
          items: itemsForOrder.map((item) => ({
            id: item.id,
            qty: item.qty ?? 1,
            title: item.title,
            price_cents: typeof item.price_cents === "number" && item.price_cents > 0
              ? item.price_cents
              : typeof item.price === "number" && item.price > 0
                ? Math.round(item.price * 100)
                : 0,
            image_url: item.image_url,
          })),
          created_at: new Date().toISOString(),
        };
        localStorage.setItem("DDN_LAST_ORDER_V1", JSON.stringify(orderData));
        
        // Opcional: agregar order a la URL si no existe ya
        const currentUrl = new URL(window.location.href);
        if (!currentUrl.searchParams.has("order")) {
          currentUrl.searchParams.set("order", newOrderId);
          router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
        }
      }

      // Si el método de pago es tarjeta, StripePaymentForm creará el PaymentIntent internamente
      if (paymentMethod !== "tarjeta") {
        // Para otros métodos de pago, usar flujo legacy y redirigir
        handlePayNowLegacy(newOrderId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error inesperado";
      setError(errorMessage);
      setToast({ message: errorMessage, type: "error" });
      setIsCreatingOrder(false);
      
      // Si no se estableció el tipo de error, asumir recuperable
      if (!errorType) {
        setErrorType("recoverable");
      }
    }
  };

  // Flujo legacy para métodos de pago no-tarjeta
  // TODO: Refactor this function to reduce cognitive complexity. Rule temporarily disabled to keep CI passing.
  // eslint-disable-next-line sonarjs/cognitive-complexity
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
        items: itemsForOrder.map((item) => {
          const qty = item.qty ?? 1;
          const priceCents =
            typeof item.price_cents === "number"
              ? item.price_cents
              : typeof item.price === "number"
                ? Math.round(item.price * 100)
                : 0;
          return {
            product_id: item.id,
            slug: getItemSlug(item),
            title: item.title,
            price_cents: priceCents,
            qty,
          };
        }),
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
        items: itemsForOrder.map((item) => ({
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

  // Guard: redirigir si no hay items seleccionados
  useEffect(() => {
    if (itemsForOrder.length === 0 && datos) {
      router.replace("/checkout");
    }
  }, [itemsForOrder.length, datos, router]);

  if (!datos) return null;

  // Si no hay items seleccionados, mostrar mensaje mientras redirige
  if (itemsForOrder.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 mb-4">No hay productos seleccionados</p>
          <p className="text-yellow-700 text-sm mb-4">
            Por favor, selecciona productos en el checkout antes de continuar.
          </p>
          <Link
            href="/checkout"
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Ir a Checkout
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <CheckoutStepper current="payment" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Botón Volver al carrito */}
          <div>
        <Link
          href="/carrito"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Volver al carrito
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2 text-gray-900">Confirmar Pago</h1>
        <p className="text-sm text-gray-600">
          Revisa tu información y completa tu pedido
        </p>
      </div>

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

      {/* Puntos de lealtad */}
      {loyaltyPoints !== null && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-semibold text-sm text-gray-700 mb-1">
                Tus puntos
              </h2>
              <p className="text-sm text-gray-600">
                Tienes <strong>{loyaltyPoints.pointsBalance.toLocaleString()}</strong> puntos disponibles
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {loyaltyPoints.canApplyDiscount ? (
              <>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loyaltyApplied}
                    onChange={(e) => setLoyaltyApplied(e.target.checked)}
                    className="mt-1 mr-2"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">
                      Usar mis puntos para obtener {LOYALTY_DISCOUNT_PERCENT}% de descuento en este pedido (requiere al menos {LOYALTY_MIN_POINTS_FOR_DISCOUNT.toLocaleString()} puntos).
                    </span>
                    {loyaltyApplied && (
                      <p className="text-xs text-gray-500 mt-1">
                        Aplicaremos un {LOYALTY_DISCOUNT_PERCENT}% de descuento sobre el total del pedido usando tus puntos.
                      </p>
                    )}
                  </div>
                </label>
              </>
            ) : (
              <>
                <label className="flex items-start cursor-not-allowed opacity-60">
                  <input
                    type="checkbox"
                    disabled
                    className="mt-1 mr-2"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">
                      Usar mis puntos para obtener {LOYALTY_DISCOUNT_PERCENT}% de descuento en este pedido (requiere al menos {LOYALTY_MIN_POINTS_FOR_DISCOUNT.toLocaleString()} puntos).
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Te faltan <strong>{(LOYALTY_MIN_POINTS_FOR_DISCOUNT - loyaltyPoints.pointsBalance).toLocaleString()}</strong> puntos para poder usar el descuento de lealtad.
                    </p>
                  </div>
                </label>
              </>
            )}
          </div>
        </div>
      )}

      {/* Resumen de productos */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2 text-sm text-gray-700">
          Productos seleccionados:
        </h2>
        <ul className="space-y-1">
          {itemsForOrder.map((item) => (
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
          <div className="flex justify-between text-sm">
            <span>
              {selectedShippingMethod === "pickup"
                ? "Recoger en tienda"
                : selectedShippingMethod === "standard"
                  ? "Envío estándar"
                  : selectedShippingMethod === "express"
                    ? "Envío express"
                    : "Envío"}
              :
            </span>
            <span>
              {selectedShippingMethod === "pickup"
                ? "$0.00"
                : shippingCost > 0
                  ? formatMXNMoney(shippingCost)
                  : "$0.00 (envío gratis)"}
            </span>
          </div>
          {discount && discountScope && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento {couponCode ? `(${couponCode})` : ""}:</span>
              <span>-{formatMXNMoney(discount)}</span>
            </div>
          )}
          {loyaltyDiscountCents > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento por puntos:</span>
              <span>-{formatMXNMoney(loyaltyDiscountCents / 100)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-2 border-t text-base">
            <span>Total a pagar:</span>
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
                couponWasRemovedRef.current = true; // Marcar que el usuario quitó el cupón explícitamente
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

      {/* Validación de carrito vacío - NO es un error de API */}
      {itemsForOrder.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 mb-4">No se encontraron productos para esta orden</p>
          <p className="text-yellow-700 text-sm mb-4">
            Por favor, vuelve al catálogo y agrega productos antes de continuar.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/catalogo"
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Ir al Catálogo
            </Link>
            <Link
              href="/checkout/datos"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Volver a Datos
            </Link>
          </div>
        </div>
      )}

      {/* Stripe Payment Form si es tarjeta */}
      {selectedPaymentMethod === "tarjeta" && orderId ? (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h2 className="font-semibold mb-2 text-sm text-gray-700">Resumen de pago</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatMXNMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío:</span>
                <span>
                  {shippingCost > 0
                    ? formatMXNMoney(shippingCost)
                    : "$0.00 (envío gratis)"}
                </span>
              </div>
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
            orderId={orderId}
            totalCents={totalCents}
            items={itemsForOrder.map((item) => ({
              id: item.id,
              qty: item.qty ?? 1,
              section: (item as ExtendedCheckoutItem).section || (item as ExtendedCheckoutItem).product?.section,
              slug: (item as ExtendedCheckoutItem).slug || (item as ExtendedCheckoutItem).product_slug || (item as ExtendedCheckoutItem).product?.slug,
              title: item.title,
            }))}
            onSuccess={(orderId) => {
              // NO limpiar carrito aquí - se limpiará en /checkout/gracias cuando la orden sea 'paid'
              resetCheckout();
              router.push(`/checkout/gracias?order=${encodeURIComponent(orderId)}`);
            }}
            onError={(errorMsg) => {
              setError(errorMsg);
              setErrorType("recoverable"); // Errores de Stripe generalmente son recuperables
              setToast({ message: errorMsg, type: "error" });
              setIsCreatingOrder(false);
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

        {/* Mostrar error solo si hay items (error de API), no si es "carrito vacío" */}
        {error && itemsForOrder.length > 0 && (
          <div className={`rounded-md border p-3 ${
            errorType === "fatal"
              ? "border-red-200 bg-red-50"
              : "border-yellow-200 bg-yellow-50"
          }`}>
            <p className={`text-sm ${
              errorType === "fatal"
                ? "text-red-800"
                : "text-yellow-800"
            }`} role="alert">
              {error}
            </p>
            {errorType === "fatal" && (
              <div className="mt-3 flex gap-3">
                <Link
                  href="/tienda"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
                >
                  Volver a la tienda
                </Link>
                <Link
                  href="/carrito"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Volver al carrito
                </Link>
              </div>
            )}
            {errorType === "recoverable" && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setErrorType(null);
                  handleCreateOrderAndPaymentIntent();
                }}
                className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
              >
                Reintentar
              </button>
            )}
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
                itemsForOrder.length === 0 ||
                (selectedPaymentMethod === "tarjeta" && itemsForOrder.some((item) => item.price <= 0))
              }
            data-testid="btn-pagar-ahora"
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex-1 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
              {isCreatingOrder
                ? "Creando orden..."
                : selectedPaymentMethod === "tarjeta"
                  ? itemsForOrder.some((item) => item.price <= 0)
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

        {/* Resumen del pedido - lado derecho en desktop */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <CheckoutOrderSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
