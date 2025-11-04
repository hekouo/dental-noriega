"use client";

import { Suspense } from "react";
import { useFormContext } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { useCartStore } from "@/lib/store/cartStore";

function CheckoutDebugPanelContent() {
  // Hooks siempre se llaman primero, antes de cualquier early return
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const formContext = useFormContext();
  const formState = formContext?.formState ?? {};
  const getValues = formContext?.getValues ?? (() => ({}));
  const datos = useCheckoutStore((s) => s.datos);
  const items = useCartStore((s) => s.cartItems);
  const searchParams = useSearchParams();
  const debugParam = searchParams?.get("debug") === "1";

  const isDebugEnabled =
    process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1" || debugParam;

  if (!isDebugEnabled) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        zIndex: 9999,
        background: "#111",
        color: "#0f0",
        padding: 8,
        borderRadius: 8,
        maxWidth: 360,
        fontSize: 12,
        whiteSpace: "pre-wrap",
        fontFamily: "monospace",
      }}
    >
      <strong>Checkout Debug</strong>
      {"\n"}isValid: {String(formState?.isValid ?? false)} submitting:{" "}
      {String(formState?.isSubmitting ?? false)}
      {"\n"}errors: {JSON.stringify(formState?.errors ?? {}, null, 0)}
      {"\n"}values: {JSON.stringify(getValues(), null, 0)}
      {"\n"}datosStore: {JSON.stringify(Boolean(datos))}
      {"\n"}items: {items?.length ?? 0}
    </div>
  );
}

export default function CheckoutDebugPanel() {
  return (
    <Suspense fallback={null}>
      <CheckoutDebugPanelContent />
    </Suspense>
  );
}
