"use client";

import React from "react";
import { useEffect, Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelectedIds } from "@/lib/store/checkoutSelectors";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { datosSchema, type DatosForm, MX_STATES } from "@/lib/checkout/schemas";
import CheckoutStepper from "@/components/checkout/CheckoutStepper";
import CheckoutDebugPanel from "@/components/CheckoutDebugPanel";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { formatMXN as formatMXNMoney } from "@/lib/utils/money";
import { getSelectedItems } from "@/lib/checkout/selection";
import type { AccountAddress } from "@/lib/supabase/addresses.server";
import { isValidEmail } from "@/lib/validation/email";
import { splitFullName, buildFullName } from "@/lib/utils/names";

// eslint-disable-next-line sonarjs/cognitive-complexity -- Formulario largo pero estructurado, todos los campos son necesarios
function DatosPageContent() {
  const router = useRouter();
  const selectedIds = useSelectedIds();
  const datos = useCheckoutStore((s) => s.datos);
  const checkoutItems = useCheckoutStore((s) => s.checkoutItems);
  const selectedItems = React.useMemo(() => getSelectedItems(checkoutItems), [checkoutItems]);
  const couponCode = useCheckoutStore((s) => s.couponCode);
  const discount = useCheckoutStore((s) => s.discount);
  const discountScope = useCheckoutStore((s) => s.discountScope);

  // Guard: redirigir si no hay items seleccionados
  React.useEffect(() => {
    if (selectedItems.length === 0) {
      router.replace("/checkout");
    }
  }, [selectedItems.length, router]);

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

  // Estado para direcciones guardadas
  const [addresses, setAddresses] = useState<AccountAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // En /checkout/datos NO se puede aplicar cupón, solo se muestra resumen si ya está aplicado

  // Analytics: begin_checkout al entrar a la página
  useEffect(() => {
    track("begin_checkout");
  }, []);

  // Cargar direcciones cuando el email cambia (solo si es válido)
  const emailValue = watch("email");
  useEffect(() => {
    // Limpiar direcciones si el email no es válido
    if (!isValidEmail(emailValue)) {
      setAddresses([]);
      setSelectedAddressId(null);
      return;
    }

    // Debounce: esperar 400ms antes de llamar a la API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      loadAddresses(controller.signal).catch((err) => {
        // Ignorar errores de abort
        if (err.name !== "AbortError") {
          if (process.env.NODE_ENV === "development") {
            console.error("[loadAddresses] Error:", err);
          }
          setAddressesError("No pudimos cargar tus direcciones guardadas, pero puedes seguir llenando el formulario.");
        }
      });
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
      setAddressesError(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailValue]);

  const loadAddresses = async (signal?: AbortSignal) => {
    if (!isValidEmail(emailValue)) {
      setAddressesError(null);
      return;
    }

    setAddressesError(null);
    try {
      const normalizedEmail = emailValue!.trim().toLowerCase();
      const response = await fetch(
        `/api/account/addresses?email=${encodeURIComponent(normalizedEmail)}`,
        { signal },
      );

      // Ignorar si fue abortado
      if (signal?.aborted) return;

      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
        setAddressesError(null);
        // Si hay una dirección predeterminada, seleccionarla automáticamente
        const defaultAddress = data.addresses?.find((a: AccountAddress) => a.is_default);
        if (defaultAddress && !selectedAddressId) {
          handleSelectAddress(defaultAddress);
        }
      } else {
        setAddressesError("No pudimos cargar tus direcciones guardadas, pero puedes seguir llenando el formulario.");
      }
    } catch (err) {
      // Ignorar errores de abort
      if (err instanceof Error && err.name === "AbortError") return;
      setAddressesError("No pudimos cargar tus direcciones guardadas, pero puedes seguir llenando el formulario.");
      if (process.env.NODE_ENV === "development") {
        console.error("[loadAddresses] Error:", err);
      }
    }
  };

  const handleSelectAddress = (address: AccountAddress) => {
    setSelectedAddressId(address.id);
    setUseSavedAddress(true);
    // Autocompletar formulario usando helper para dividir nombre completo
    const { firstName, lastName } = splitFullName(address.full_name);
    setValue("name", firstName);
    setValue("last_name", lastName);
    setValue("phone", address.phone);
    setValue("address", address.street);
    setValue("neighborhood", address.neighborhood);
    setValue("city", address.city);
    setValue("state", address.state);
    setValue("cp", address.zip_code);
  };

  const handleUseNewAddress = () => {
    setUseSavedAddress(false);
    setSelectedAddressId(null);
  };

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
    setSubmitError(null);
    try {
      const store = useCheckoutStore.getState();
      // Asegurar que checkoutItems esté presente antes de avanzar
      // Si viene del flujo normal (checkout → datos), los items ya deberían estar
      // Si viene de "Comprar ahora", también deberían estar
      // Por seguridad, verificar que hay items seleccionados
      const checkoutItems = store.checkoutItems;
      if (checkoutItems.length === 0) {
        // Si no hay items, no avanzar y mostrar mensaje
        setSubmitError("No hay productos seleccionados. Por favor, vuelve al carrito.");
        console.warn("[datos] No hay items en checkoutStore, no se puede avanzar a pago");
        return;
      }

      // Si el usuario marcó "Guardar dirección", crear/actualizar en account_addresses
      if (saveAddress && !useSavedAddress && values.email) {
        try {
          const normalizedEmail = values.email.trim().toLowerCase();
          const addressData = {
            full_name: buildFullName(values.name, values.last_name),
            phone: values.phone,
            street: values.address,
            neighborhood: values.neighborhood,
            city: values.city,
            state: values.state,
            zip_code: values.cp,
            country: "México",
            is_default: addresses.length === 0, // Primera dirección = default
          };

          const response = await fetch("/api/account/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: normalizedEmail,
              ...addressData,
            }),
          });

          if (!response.ok) {
            // No bloquear el flujo si falla guardar la dirección, solo loguear
            console.warn("[onSubmit] Error al guardar dirección:", await response.text());
          }
        } catch (err) {
          // No bloquear el flujo si falla guardar la dirección
          console.warn("[onSubmit] Error al guardar dirección:", err);
        }
      }

      store.setDatos(values); // avanza step -> "pago" y persiste checkoutItems
      router.push("/checkout/pago");
    } catch (err) {
      console.error("submit(datos) failed", err);
      setSubmitError("Hubo un problema al procesar tus datos. Por favor, intenta de nuevo.");
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
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-6">
      <CheckoutStepper current="details" />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2 text-gray-900">Datos de Envío</h1>
        <p className="text-sm text-gray-600">
          Completa la información para entregar tu pedido. Solo usaremos estos datos para el envío y actualizaciones por correo.
        </p>
      </div>

      {/* Mensaje de error al cargar direcciones */}
      {addressesError && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 text-sm text-yellow-800 p-3 mb-4">
          {addressesError}
        </div>
      )}

      {/* Mensaje de error al enviar formulario */}
      {submitError && (
        <div className="rounded-md border border-red-200 bg-red-50 text-sm text-red-800 p-3 mb-4" role="alert">
          {submitError}
        </div>
      )}

      {/* Selector de direcciones guardadas */}
      {addresses.length > 0 && emailValue && emailValue.includes("@") && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">Direcciones guardadas</h2>
          <p className="text-sm text-gray-600 mb-4">
            Selecciona una dirección guardada o usa una nueva
          </p>
          <div className="space-y-2">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedAddressId === address.id && useSavedAddress
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onClick={() => handleSelectAddress(address)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {address.is_default && (
                      <span className="inline-block px-2 py-0.5 bg-primary-100 text-primary-800 text-xs font-medium rounded mb-1">
                        Predeterminada
                      </span>
                    )}
                    <p className="font-medium text-gray-900">{address.full_name}</p>
                    <p className="text-sm text-gray-600">{address.phone}</p>
                    <p className="text-sm text-gray-700 mt-1">
                      {address.street}, {address.neighborhood}, {address.city}, {address.state} {address.zip_code}
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="selectedAddress"
                    checked={selectedAddressId === address.id && useSavedAddress}
                    onChange={() => handleSelectAddress(address)}
                    className="ml-2 mt-1"
                    aria-label={`Seleccionar dirección de ${address.full_name}`}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleUseNewAddress}
              className="w-full mt-3 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              Usar una dirección nueva
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <CheckoutDebugPanel />
        {/* Nombre y Apellido */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos personales</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre (s) *
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                onBlur={() => handleBlur("name")}
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? "name-error" : undefined}
                placeholder="Ej: Juan"
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
                Apellido (s) *
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
                placeholder="Ej: Pérez García"
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
            aria-describedby={errors.email ? "email-error" : "email-help"}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="tu@email.com"
          />
          <p id="email-help" className="text-gray-500 text-xs mt-1">
            Te enviaremos la confirmación y actualizaciones del pedido a este correo
          </p>
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
            Teléfono *
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            {...register("phone")}
            aria-invalid={errors.phone ? "true" : "false"}
            aria-describedby={errors.phone ? "phone-error" : "phone-help"}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.phone ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="5512345678"
            maxLength={10}
          />
          <p id="phone-help" className="text-gray-500 text-xs mt-1">
            10 dígitos, solo números (sin espacios ni guiones)
          </p>
          {errors.phone && (
            <p
              id="phone-error"
              className="text-red-500 text-sm mt-1"
              role="alert"
            >
              {errors.phone.message}
            </p>
          )}
        </div>

        {/* Dirección */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dirección de envío</h2>
          </div>
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Calle y número *
            </label>
            <textarea
              id="address"
              rows={3}
              {...register("address")}
              onBlur={() => handleBlur("address")}
              aria-invalid={errors.address ? "true" : "false"}
              aria-describedby={errors.address ? "address-error" : "address-help"}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.address ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ej: Av. Insurgentes Sur 123, Int. 45"
            />
            <p id="address-help" className="text-gray-500 text-xs mt-1">
              Incluye número exterior e interior si aplica
            </p>
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
        </div>

        {/* Colonia */}
        <div>
          <label
            htmlFor="neighborhood"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Colonia o asentamiento *
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
            placeholder="Ej: Roma Norte"
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
              placeholder="Ej: 06700"
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
            placeholder="Ej: Llame antes de entregar, portería abierta 24h, referencias de la puerta..."
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

        {/* Guardar dirección */}
        {!useSavedAddress && emailValue && emailValue.includes("@") && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="saveAddress"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="saveAddress" className="text-sm text-gray-700">
              Guardar esta dirección para futuros pedidos
            </label>
          </div>
        )}

        {/* Acepta aviso */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-start">
            <input
              id="aceptaAviso"
              type="checkbox"
              {...register("aceptaAviso")}
              aria-invalid={errors.aceptaAviso ? "true" : "false"}
              aria-describedby={
                errors.aceptaAviso ? "aceptaAviso-error" : "aceptaAviso-help"
              }
              className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="aceptaAviso" className="ml-2 text-sm text-gray-700">
              Acepto el contrato de compra y el aviso de privacidad *
            </label>
          </div>
          <p id="aceptaAviso-help" className="text-xs text-gray-500 ml-6">
            Al continuar, aceptas nuestros términos y condiciones de compra
          </p>
          {errors.aceptaAviso && (
            <p
              id="aceptaAviso-error"
              className="text-red-500 text-sm mt-1 ml-6"
              role="alert"
            >
              {errors.aceptaAviso.message}
            </p>
          )}
        </div>

        {/* Resumen de cupón (solo lectura, si está aplicado) */}
        {couponCode && discount && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Cupón aplicado</p>
                <p className="text-sm text-green-600">
                  {couponCode} - {formatMXNMoney(discount)} de descuento
                  {discountScope === "shipping" && " (en envío)"}
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Puedes modificarlo en el paso de pago
              </p>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-4 pt-4">
          <Link
            href="/carrito"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            ← Volver al carrito
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
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1 font-semibold transition-colors"
          >
            Continuar al pago →
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
