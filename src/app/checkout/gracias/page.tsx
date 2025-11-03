"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CheckoutStepIndicator from "@/components/CheckoutStepIndicator";

export const dynamic = "force-dynamic";

function GraciasContent() {
  const searchParams = useSearchParams();
  const orderRef =
    searchParams?.get("orden") || searchParams?.get("order") || "";

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <CheckoutStepIndicator currentStep="gracias" />

      <h1 className="text-2xl font-semibold mb-4">¡Gracias por tu compra!</h1>
      <p className="text-gray-600 mb-6">
        {orderRef ? (
          <>
            Tu número de orden es{" "}
            <span className="font-mono font-semibold">{orderRef}</span>. Te
            contactaremos para coordinar el pago y el envío.
          </>
        ) : (
          <>
            Registramos tu pedido. Te contactaremos para coordinar el pago y el
            envío.
          </>
        )}
      </p>

      <div className="flex gap-3 flex-wrap">
        <Link href="/destacados" className="btn btn-primary">
          Seguir comprando
        </Link>
        <Link href="/catalogo" className="btn">
          Ver catálogo completo
        </Link>
      </div>

      <section className="mt-10 text-sm text-gray-500">
        <p>
          Si tienes dudas, escríbenos por WhatsApp desde la burbuja en la
          esquina.
        </p>
      </section>
    </main>
  );
}

export default function GraciasPage() {
  return (
    <Suspense
      fallback={<div className="max-w-3xl mx-auto px-4 py-10">Cargando...</div>}
    >
      <GraciasContent />
    </Suspense>
  );
}
