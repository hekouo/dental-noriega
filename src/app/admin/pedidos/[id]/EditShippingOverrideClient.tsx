"use client";

import { useState } from "react";

type Props = {
  orderId: string;
  currentOverride: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    address1?: string;
    address2?: string | null;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  } | null;
};

export default function EditShippingOverrideClient({ orderId, currentOverride }: Props) {
  const [form, setForm] = useState({
    name: currentOverride?.name || "",
    phone: currentOverride?.phone || "",
    email: currentOverride?.email || "",
    address1: currentOverride?.address1 || "",
    address2: currentOverride?.address2 || "",
    city: currentOverride?.city || "",
    state: currentOverride?.state || "",
    postal_code: currentOverride?.postal_code || "",
    country: currentOverride?.country || "MX",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const resp = await fetch("/api/admin/orders/update-shipping-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, shipping_address_override: form }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setError(data.message || "No se pudo guardar la dirección");
        return;
      }
      setOk(true);
      // Recargar para reflejar cambios en server components
      window.location.hash = "#shipping-override";
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="shipping-override" className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Editar dirección de envío (override)</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre" className="px-3 py-2 rounded-md border border-border bg-background text-foreground" />
        <input name="phone" value={form.phone ?? ""} onChange={handleChange} placeholder="Teléfono" className="px-3 py-2 rounded-md border border-border bg-background text-foreground" />
        <input name="email" value={form.email ?? ""} onChange={handleChange} placeholder="Email" className="px-3 py-2 rounded-md border border-border bg-background text-foreground" />
        <input name="address1" value={form.address1} onChange={handleChange} placeholder="Calle y número" className="px-3 py-2 rounded-md border border-border bg-background text-foreground" />
        <input name="address2" value={form.address2 ?? ""} onChange={handleChange} placeholder="Colonia / interior (opcional)" className="px-3 py-2 rounded-md border border-border bg-background text-foreground" />
        <input name="city" value={form.city} onChange={handleChange} placeholder="Ciudad" className="px-3 py-2 rounded-md border border-border bg-background text-foreground" />
        <input name="state" value={form.state} onChange={handleChange} placeholder="Estado" className="px-3 py-2 rounded-md border border-border bg-background text-foreground" />
        <input name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="CP" className="px-3 py-2 rounded-md border border-border bg-background text-foreground" />
        <input name="country" value={form.country} onChange={handleChange} placeholder="País" className="px-3 py-2 rounded-md border border-border bg-background text-foreground" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {saving ? "Guardando..." : "Guardar override"}
        </button>
        {ok && <span className="text-sm text-green-600 dark:text-green-400">Guardado</span>}
        {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Esta dirección tendrá prioridad sobre la capturada por el cliente.</p>
    </div>
  );
}


