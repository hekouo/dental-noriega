"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatosSchema, type DatosInput } from "@/lib/validations/checkout";
import { useCartStore, selectCartCore } from "@/lib/store/cartStore";
import { useRouter } from "next/navigation";

export default function DatosPage() {
  const { items, checkoutMode, overrideItems } = useCartStore(selectCartCore);
  const router = useRouter();

  const visibleItems = checkoutMode === 'buy-now' && overrideItems?.length
    ? overrideItems
    : items;

  // Redirección en effect (no durante render)
  useEffect(() => {
    if (!visibleItems.length) router.replace("/checkout");
  }, [visibleItems.length, router]);

  const form = useForm<DatosInput>({
    resolver: zodResolver(DatosSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      street: "",
      extNumber: "",
      intNumber: "",
      neighborhood: "",
      postalCode: "",
      city: "",
      state: "",
      notes: "",
    },
  });

  // Mientras redirige, no pintes nada
  if (!visibleItems.length) return null;

  function onSubmit(values: DatosInput) {
    // Guardar datos en localStorage temporalmente
    localStorage.setItem('checkout-datos', JSON.stringify(values));
    router.push("/checkout/pago");
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Datos de envío</h1>
      <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        {(
          [
            ["fullName", "Nombre completo"],
            ["email", "Email"],
            ["phone", "Teléfono"],
            ["street", "Calle"],
            ["extNumber", "No. exterior"],
            ["intNumber", "No. interior (opcional)"],
            ["neighborhood", "Colonia"],
            ["postalCode", "C.P."],
            ["city", "Ciudad"],
            ["state", "Estado"],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="grid gap-1">
            <span className="text-sm">{label}</span>
            <input
              className="border rounded px-3 py-2"
              {...form.register(name)}
            />
            <span className="text-xs text-red-600">
              {form.formState.errors[name]?.message as string | undefined}
            </span>
          </label>
        ))}
        <label className="grid gap-1">
          <span className="text-sm">Notas (opcional)</span>
          <textarea
            className="border rounded px-3 py-2"
            rows={3}
            {...form.register("notes")}
          />
        </label>
        <button className="mt-2 rounded-lg border px-4 py-2">
          Continuar a pago
        </button>
      </form>
    </main>
  );
}
