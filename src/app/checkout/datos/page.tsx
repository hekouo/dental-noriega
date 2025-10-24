"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelectedIds } from "@/lib/store/checkoutSelectors";
import { supabase } from "@/lib/supabase/client";

function DatosPageContent() {
  const selectedIds = useSelectedIds();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get("return") || "/checkout/pago";

  useEffect(() => {
    const loadUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);

        // Cargar datos existentes del perfil
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          setFormData({
            name: profile.name || "",
            email: profile.email || user.email || "",
            phone: profile.phone || "",
            address: profile.address || "",
            city: profile.city || "",
            state: profile.state || "",
            zip: profile.zip || "",
          });
        } else {
          setFormData((prev) => ({
            ...prev,
            email: user.email || "",
          }));
        }
      }
    };

    loadUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isLoading) return;

    setIsLoading(true);

    try {

      // Upsert en la tabla profiles
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error saving profile:", error);
        alert("Error al guardar los datos. Intenta de nuevo.");
        return;
      }

      // Redirigir a la URL de retorno
      router.push(returnUrl);
    } catch (error) {
      console.error("Error in form submission:", error);
      alert("Error al guardar los datos. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedIds || selectedIds.length === 0) {
    return (
      <section className="mx-auto max-w-3xl p-6 text-center">
        <h1 className="text-2xl font-semibold">No hay nada para procesar</h1>
        <p className="opacity-70 mt-2">Vuelve al carrito y agrega productos.</p>
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Datos de Envío</h1>

      {/* Resumen de productos */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h2 className="font-semibold mb-2">Productos seleccionados:</h2>
        <ul className="space-y-1">
          {selectedIds.map((id) => (
            <li key={id} className="flex justify-between text-sm">
              <span>Producto {id}</span>
              <span>x1</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Nombre completo *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">
              Teléfono *
            </label>
            <input
              type="tel"
              id="phone"
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium mb-1">
              Ciudad *
            </label>
            <input
              type="text"
              id="city"
              required
              value={formData.city}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, city: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium mb-1">
            Dirección *
          </label>
          <textarea
            id="address"
            required
            rows={3}
            value={formData.address}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, address: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="state" className="block text-sm font-medium mb-1">
              Estado
            </label>
            <input
              type="text"
              id="state"
              value={formData.state}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, state: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="zip" className="block text-sm font-medium mb-1">
              Código Postal
            </label>
            <input
              type="text"
              id="zip"
              value={formData.zip}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, zip: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={[
            "w-full py-3 rounded-lg font-semibold transition-colors",
            isLoading
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700",
          ].join(" ")}
        >
          {isLoading ? "Guardando..." : "Continuar al Pago"}
        </button>
      </form>
    </main>
  );
}

export default function DatosPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <DatosPageContent />
    </Suspense>
  );
}
