export type ShippingAddressSourceKey =
  | "shipping_address"
  | "shipping.shipping_address"
  | "shippingAddress";

export type NormalizedShippingAddress = {
  name: string | null;
  phone: string | null;
  email: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type ShippingAddressOptions = {
  requireName?: boolean;
};

const getTrimmed = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const normalizeCandidate = (
  candidate: Record<string, unknown>,
  meta: Record<string, unknown>,
  options: ShippingAddressOptions,
): NormalizedShippingAddress | null => {
  const postalCode = getTrimmed(
    candidate.postal_code || candidate.postalCode || candidate.cp,
  );
  const state = getTrimmed(candidate.state || candidate.estado);
  const city = getTrimmed(
    candidate.city ||
      candidate.ciudad ||
      candidate.municipality ||
      candidate.municipio ||
      candidate.alcaldia,
  );
  const address1 = getTrimmed(
    candidate.address1 || candidate.street1 || candidate.address || candidate.direccion || candidate.street,
  );
  const address2 = getTrimmed(
    candidate.address2 ||
      candidate.neighborhood ||
      candidate.colonia ||
      candidate.address_line2 ||
      candidate.street2,
  );
  const country = getTrimmed(
    candidate.country || candidate.country_code || candidate.countryCode || "MX",
  );
  const name = getTrimmed(candidate.name || candidate.nombre || meta.contact_name);
  const phone = getTrimmed(candidate.phone || candidate.telefono || meta.contact_phone);
  const email = getTrimmed(candidate.email || meta.contact_email);

  if (!postalCode || !state || !city || !address1) return null;
  if (options.requireName && !name) return null;

  return {
    name: name || null,
    phone: phone || null,
    email: email || null,
    address1,
    address2: address2 || null,
    city,
    state,
    postalCode,
    country: country || "MX",
  };
};

export function getOrderShippingAddress(
  orderOrMetadata: unknown,
  options: ShippingAddressOptions = {},
): { address: NormalizedShippingAddress; sourceKey: ShippingAddressSourceKey } | null {
  if (!orderOrMetadata || typeof orderOrMetadata !== "object") return null;
  const meta =
    "metadata" in orderOrMetadata
      ? ((orderOrMetadata as { metadata?: unknown }).metadata as Record<string, unknown>) || {}
      : (orderOrMetadata as Record<string, unknown>);

  if (!meta || typeof meta !== "object") return null;

  const shipping = (meta.shipping as Record<string, unknown>) || {};
  const candidates: Array<{ key: ShippingAddressSourceKey; value: unknown }> = [
    { key: "shipping_address", value: meta.shipping_address },
    { key: "shipping.shipping_address", value: shipping.shipping_address },
    { key: "shippingAddress", value: meta.shippingAddress },
  ];

  for (const candidate of candidates) {
    if (candidate.value && typeof candidate.value === "object") {
      const normalized = normalizeCandidate(
        candidate.value as Record<string, unknown>,
        meta,
        options,
      );
      if (normalized) {
        return { address: normalized, sourceKey: candidate.key };
      }
    }
  }

  return null;
}
