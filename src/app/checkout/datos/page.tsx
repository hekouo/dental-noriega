"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatosSchema, type DatosInput } from "@/lib/validations/checkout";
import { useCheckout } from "@/lib/store/checkoutStore";
import { useRouter } from "next/navigation";

export default function DatosPage() {
  const { datos, setDatos, items } = useCheckout();
  const router = useRouter();

  const form = useForm<DatosInput>({
    resolver: zodResolver(DatosSchema),
    defaultValues: datos ?? {
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

  if (!items.length) {
    if (typeof window !== "undefined") router.push("/checkout");
    return null;
  }

  function onSubmit(values: DatosInput) {
    setDatos(values);
    router.push("/checkout/pago");
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Datos de envío</h1>
      <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        {[
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
        ].map(([name, label]) => (
          <label key={name} className="grid gap-1">
            <span className="text-sm">{label}</span>
            <input
              className="border rounded px-3 py-2"
              {...form.register(name as any)}
            />
            <span className="text-xs text-red-600">
              {form.formState.errors[name as keyof DatosInput]?.message as any}
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
