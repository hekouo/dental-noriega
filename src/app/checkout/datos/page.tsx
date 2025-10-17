"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/lib/store/cartStore";
import { useRouter } from "next/navigation";
import {
  formatCurrency,
  calculateShipping,
  calculatePointsValue,
  calculateMaxRedeemablePoints,
} from "@/lib/utils/currency";

const PICKUP_LOCATIONS = [
  { id: "1", name: "Sucursal Centro", address: "Av. Juárez 123, Centro, CDMX" },
  {
    id: "2",
    name: "Sucursal Sur",
    address: "Av. Insurgentes Sur 456, Del Valle, CDMX",
  },
];

export default function CheckoutDatosPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getSubtotal = useCartStore((state) => state.getSubtotal);

  const [method, setMethod] = useState<"shipping" | "pickup">("shipping");
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [selectedPickupId, setSelectedPickupId] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedMethod = localStorage.getItem("checkout_method");
    if (savedMethod) setMethod(savedMethod as any);

    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Load addresses
      const { data: addressData } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      setAddresses(addressData || []);
      if (addressData && addressData.length > 0) {
        setSelectedAddressId(addressData[0].id);
      }

      // Load profile
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);
    }
  };

  const subtotal = getSubtotal();
  const shipping = method === "shipping" ? calculateShipping(subtotal) : 0;
  const pointsDiscount = calculatePointsValue(pointsToRedeem);
  const total = Math.max(0, subtotal + shipping - pointsDiscount);
  const maxRedeemable = calculateMaxRedeemablePoints(
    subtotal + shipping,
    profile?.points_balance || 0,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const checkoutData = {
        items: items.map((item) => ({
          sku: item.sku,
          name: item.name,
          price: item.price,
          qty: item.qty,
        })),
        fulfillment_method: method,
        address_id: method === "shipping" ? selectedAddressId : null,
        pickup_location:
          method === "pickup"
            ? PICKUP_LOCATIONS.find((l) => l.id === selectedPickupId)?.name
            : null,
        contact: {
          name: formData.get("name") as string,
          phone: formData.get("phone") as string,
          email: formData.get("email") as string,
        },
        points_to_redeem: pointsToRedeem,
        subtotal,
        shipping_cost: shipping,
        discount_amount: pointsDiscount,
        total,
      };

      // Save to localStorage for payment page
      localStorage.setItem("checkout_data", JSON.stringify(checkoutData));
      router.push("/checkout/pago");
    } catch (error) {
      alert("Error al procesar el pedido");
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Datos de Contacto y Entrega</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Contact */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Datos de Contacto
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="label">Nombre completo</label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={profile?.full_name}
                      className="input"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Teléfono</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        defaultValue={profile?.phone}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Correo electrónico</label>
                      <input
                        type="email"
                        name="email"
                        required
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address or Pickup */}
              {method === "shipping" ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Dirección de Envío
                  </h2>
                  {addresses.length === 0 ? (
                    <p className="text-gray-600">
                      No tienes direcciones guardadas.{" "}
                      <a
                        href="/cuenta/direcciones"
                        className="text-primary-600 hover:underline"
                      >
                        Agrega una dirección
                      </a>
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((address) => (
                        <label
                          key={address.id}
                          className={`block p-4 rounded-lg border-2 cursor-pointer ${
                            selectedAddressId === address.id
                              ? "border-primary-600 bg-primary-50"
                              : "border-gray-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            value={address.id}
                            checked={selectedAddressId === address.id}
                            onChange={(e) =>
                              setSelectedAddressId(e.target.value)
                            }
                            className="sr-only"
                          />
                          <p className="font-medium">{address.label}</p>
                          <p className="text-sm text-gray-600">
                            {address.street} {address.ext_no},{" "}
                            {address.neighborhood}
                            <br />
                            {address.city}, {address.state} {address.zip}
                          </p>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Punto de Recogida
                  </h2>
                  <div className="space-y-3">
                    {PICKUP_LOCATIONS.map((location) => (
                      <label
                        key={location.id}
                        className={`block p-4 rounded-lg border-2 cursor-pointer ${
                          selectedPickupId === location.id
                            ? "border-primary-600 bg-primary-50"
                            : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="pickup"
                          value={location.id}
                          checked={selectedPickupId === location.id}
                          onChange={(e) => setSelectedPickupId(e.target.value)}
                          required
                          className="sr-only"
                        />
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm text-gray-600">
                          {location.address}
                        </p>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Points */}
              {profile && profile.points_balance > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Puntos</h2>
                  <p className="text-gray-600 mb-4">
                    Tienes <strong>{profile.points_balance} puntos</strong>{" "}
                    disponibles (equivalentes a{" "}
                    {formatCurrency(
                      calculatePointsValue(profile.points_balance),
                    )}
                    )
                  </p>
                  <div>
                    <label className="label">
                      Puntos a canjear (máximo: {maxRedeemable})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={maxRedeemable}
                      step="100"
                      value={pointsToRedeem}
                      onChange={(e) =>
                        setPointsToRedeem(Number(e.target.value))
                      }
                      className="input"
                    />
                    {pointsToRedeem > 0 && (
                      <p className="text-sm text-primary-600 mt-2">
                        Descuento: {formatCurrency(pointsDiscount)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-24">
                <h2 className="text-xl font-semibold mb-4">Resumen</h2>

                <div className="space-y-2 mb-4 text-sm">
                  {items.map((item) => (
                    <div key={item.sku} className="flex justify-between">
                      <span className="text-gray-600">
                        {item.name} x{item.qty}
                      </span>
                      <span>{formatCurrency(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Envío</span>
                    <span>
                      {shipping === 0 ? "Gratis" : formatCurrency(shipping)}
                    </span>
                  </div>
                  {pointsToRedeem > 0 && (
                    <div className="flex justify-between text-primary-600">
                      <span>Descuento (puntos)</span>
                      <span>-{formatCurrency(pointsDiscount)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (method === "shipping" && !selectedAddressId) ||
                    (method === "pickup" && !selectedPickupId)
                  }
                  className="w-full btn btn-primary disabled:opacity-50"
                >
                  {isSubmitting ? "Procesando..." : "Ir a Pagar"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}
