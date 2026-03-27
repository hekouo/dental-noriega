import "server-only";

export type PickupOrigin = {
  name: string;
  phone: string;
  email: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

/**
 * Origen fijo de pickup (negocio). Solo server-side.
 * Si falta configuración crítica, devuelve null y reason.
 */
export function getPickupOrigin():
  | { ok: true; origin: PickupOrigin }
  | { ok: false; reason: string } {
  const name = process.env.PICKUP_NAME?.trim() || "";
  const phone = process.env.PICKUP_PHONE?.trim() || "";
  const email = process.env.PICKUP_EMAIL?.trim() || "";
  const address1 = process.env.PICKUP_ADDRESS1?.trim() || "";
  const address2 = process.env.PICKUP_ADDRESS2?.trim() || null;
  const city = process.env.PICKUP_CITY?.trim() || "";
  const state = process.env.PICKUP_STATE?.trim() || "";
  const postal_code = process.env.PICKUP_POSTAL_CODE?.trim() || "";
  const country = process.env.PICKUP_COUNTRY?.trim() || "MX";

  if (!name || !phone || !email || !address1 || !city || !state || !postal_code) {
    return { ok: false, reason: "Pickup origin no configurado" };
  }

  return {
    ok: true,
    origin: {
      name,
      phone,
      email,
      address1,
      address2,
      city,
      state,
      postal_code,
      country,
    },
  };
}

