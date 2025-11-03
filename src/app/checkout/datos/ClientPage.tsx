"use client";

import React from "react";
import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelectedIds } from "@/lib/store/checkoutSelectors";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { datosSchema, type DatosForm, MX_STATES } from "@/lib/checkout/schemas";
import CheckoutStepIndicator from "@/components/CheckoutStepIndicator";
import CheckoutDebugPanel from "@/components/CheckoutDebugPanel";
import Link from "next/link";

// eslint-disable-next-line sonarjs/cognitive-complexity -- Formulario largo pero estructurado, todos los campos son necesarios
function DatosPageContent() {
  const router = useRouter();
  const selectedIds = useSelectedIds();
  const datos = useCheckoutStore((s) => s.datos);

  const form = useForm<DatosForm>({
    resolver: zodResolver(datosSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    criteriaMode: "all",
    defaultValues: datos || {
      name: "",
      last_name: "",
      email: "",
      phone: "",
      address: "",
      neighborhood: "",
      city: "",
      state: "",
      cp: "",
      notes: undefined,
      aceptaAviso: false as unknown as true,
    },
  });

  const { register, handleSubmit, formState, setValue, watch } = form;

  const { errors, isValid, isSubmitting } = formState;

  // Máscara de teléfono: solo números, bloquea e, +, -, .
  useEffect(() => {
    const input = document.getElementById("phone");
    if (!input) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "e" ||
        e.key === "E" ||
        e.key === "+" ||
        e.key === "-" ||
        e.key === "."
      ) {
        e.preventDefault();
      }
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = target.value.replace(/\D/g, ""); // Solo números
      if (value.length > 10) {
        target.value = value.slice(0, 10);
      } else {
        target.value = value;
      }
      setValue("phone", target.value, { shouldValidate: true });
    };

    input.addEventListener("keydown", handleKeyDown);
    input.addEventListener("input", handleInput);

    return () => {
      input.removeEventListener("keydown", handleKeyDown);
      input.removeEventListener("input", handleInput);
    };
  }, [setValue]);

  // Sanitización: trim en blur para campos de texto
  const handleBlur = (field: keyof DatosForm) => {
    const value = watch(field);
    if (typeof value === "string") {
      setValue(field, value.trim() as never, { shouldValidate: true });
    }
  };

  const onSubmit: SubmitHandler<DatosForm> = async (values) => {
    try {
      useCheckoutStore.getState().setDatos(values); // avanza step -> "pago"
      router.push("/checkout/pago");
    } catch (err) {
      console.error("submit(datos) failed", err);
    }
  };

  if (!selectedIds || selectedIds.length === 0) {
    return (
      <section className="mx-auto max-w-3xl p-6 text-center">
        <h1 className="text-2xl font-semibold">No hay nada para procesar</h1>
        <p className="opacity-70 mt-2">Vuelve al carrito y agrega productos.</p>
        <Link href="/carrito" className="btn btn-primary mt-4">
          <span>Ir al carrito</span>
        </Link>
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <CheckoutStepIndicator currentStep="datos" />

      <h1 className="text-2xl font-semibold">Datos de Envío</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <CheckoutDebugPanel />
        {/* Nombre y Apellido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nombre *
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              onBlur={() => handleBlur("name")}
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p
                id="name-error"
                className="text-red-500 text-sm mt-1"
                role="alert"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="last_name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Apellido *
            </label>
            <input
              id="last_name"
              type="text"
              {...register("last_name")}
              onBlur={() => handleBlur("last_name")}
              aria-invalid={errors.last_name ? "true" : "false"}
              aria-describedby={
                errors.last_name ? "last_name-error" : undefined
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.last_name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.last_name && (
              <p
                id="last_name-error"
                className="text-red-500 text-sm mt-1"
                role="alert"
              >
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Correo electrónico *
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            onBlur={() => handleBlur("email")}
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="tu@email.com"
          />
          {errors.email && (
            <p
              id="email-error"
              className="text-red-500 text-sm mt-1"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Teléfono (10 dígitos) *
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            {...register("phone")}
            aria-invalid={errors.phone ? "true" : "false"}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.phone ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="5512345678"
            maxLength={10}
          />
          {errors.phone && (
            <p
              id="phone-error"
              className="text-red-500 text-sm mt-1"
              role="alert"
            >
              {errors.phone.message}
            </p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Solo números, sin espacios ni guiones
          </p>
        </div>

        {/* Dirección */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Dirección *
          </label>
          <textarea
            id="address"
            rows={3}
            {...register("address")}
            onBlur={() => handleBlur("address")}
            aria-invalid={errors.address ? "true" : "false"}
            aria-describedby={errors.address ? "address-error" : undefined}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.address ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Calle y número"
          />
          {errors.address && (
            <p
              id="address-error"
              className="text-red-500 text-sm mt-1"
              role="alert"
            >
              {errors.address.message}
            </p>
          )}
        </div>

        {/* Colonia */}
        <div>
          <label
            htmlFor="neighborhood"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Colonia *
          </label>
          <input
            id="neighborhood"
            type="text"
            {...register("neighborhood")}
            onBlur={() => handleBlur("neighborhood")}
            aria-invalid={errors.neighborhood ? "true" : "false"}
            aria-describedby={
              errors.neighborhood ? "neighborhood-error" : undefined
            }
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.neighborhood ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Colonia o delegación"
          />
          {errors.neighborhood && (
            <p
              id="neighborhood-error"
              className="text-red-500 text-sm mt-1"
              role="alert"
            >
              {errors.neighborhood.message}
            </p>
          )}
        </div>

        {/* Ciudad, Estado, CP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ciudad *
            </label>
            <input
              id="city"
              type="text"
              {...register("city")}
              onBlur={() => handleBlur("city")}
              aria-invalid={errors.city ? "true" : "false"}
              aria-describedby={errors.city ? "city-error" : undefined}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.city ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.city && (
              <p
                id="city-error"
                className="text-red-500 text-sm mt-1"
                role="alert"
              >
                {errors.city.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="state"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Estado *
            </label>
            <select
              id="state"
              {...register("state")}
              aria-invalid={errors.state ? "true" : "false"}
              aria-describedby={errors.state ? "state-error" : undefined}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.state ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Selecciona...</option>
              {MX_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {errors.state && (
              <p
                id="state-error"
                className="text-red-500 text-sm mt-1"
                role="alert"
              >
                {errors.state.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="cp"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Código Postal *
            </label>
            <input
              id="cp"
              type="text"
              inputMode="numeric"
              {...register("cp")}
              aria-invalid={errors.cp ? "true" : "false"}
              aria-describedby={errors.cp ? "cp-error" : undefined}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.cp ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="12345"
              maxLength={5}
            />
            {errors.cp && (
              <p
                id="cp-error"
                className="text-red-500 text-sm mt-1"
                role="alert"
              >
                {errors.cp.message}
              </p>
            )}
          </div>
        </div>

        {/* Notas opcionales */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Notas adicionales (opcional)
          </label>
          <textarea
            id="notes"
            rows={3}
            {...register("notes")}
            onBlur={() => handleBlur("notes")}
            aria-invalid={errors.notes ? "true" : "false"}
            aria-describedby={errors.notes ? "notes-error" : "notes-help"}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.notes ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Instrucciones de entrega, referencias, etc."
          />
          <p id="notes-help" className="text-gray-500 text-xs mt-1">
            Máximo 300 caracteres
          </p>
          {errors.notes && (
            <p
              id="notes-error"
              className="text-red-500 text-sm mt-1"
              role="alert"
            >
              {errors.notes.message}
            </p>
          )}
        </div>

        {/* Acepta aviso */}
        <div className="flex items-start">
          <input
            id="aceptaAviso"
            type="checkbox"
            {...register("aceptaAviso")}
            aria-invalid={errors.aceptaAviso ? "true" : "false"}
            aria-describedby={
              errors.aceptaAviso ? "aceptaAviso-error" : undefined
            }
            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="aceptaAviso" className="ml-2 text-sm text-gray-700">
            Acepto el{" "}
            <Link
              href="/aviso-privacidad"
              className="text-primary-600 underline"
            >
              aviso de privacidad
            </Link>{" "}
            *
          </label>
        </div>
        {errors.aceptaAviso && (
          <p
            id="aceptaAviso-error"
            className="text-red-500 text-sm mt-1"
            role="alert"
          >
            {errors.aceptaAviso.message}
          </p>
        )}

        {/* Botones */}
        <div className="flex gap-4 pt-4">
          <Link
            href="/carrito"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Volver al carrito
          </Link>
          <button
            type="submit"
            onClick={(e) => {
              e.currentTarget.blur();
              handleSubmit(onSubmit)();
            }}
            disabled={!isValid || isSubmitting}
            aria-disabled={!isValid || isSubmitting}
            data-testid="btn-continuar-pago"
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            Guardar y continuar
          </button>
        </div>
      </form>
    </main>
  );
}

export default function DatosPageClient() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <DatosPageContent />
    </Suspense>
  );
}
