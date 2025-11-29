import "server-only";

/**
 * Tipos para la integración con Skydropx
 */
export type SkydropxRate = {
  provider: string; // p.ej. "estafeta", "dhl"
  service: string; // nombre del servicio
  totalPriceCents: number; // entero en centavos MXN
  currency: string; // "MXN"
  etaMinDays: number | null;
  etaMaxDays: number | null;
  externalRateId: string; // id de la tarifa que devuelve Skydropx
};

export type SkydropxDestination = {
  postalCode: string;
  state: string;
  city: string;
  country?: string; // default "MX"
};

export type SkydropxPackageInput = {
  weightGrams: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
};

/**
 * Obtiene la configuración de origen desde env vars
 */
function getOriginConfig() {
  const apiKey = process.env.SKYDROPX_API_KEY;
  const isSandbox = process.env.SKYDROPX_IS_SANDBOX === "true";
  const originName = process.env.SKYDROPX_ORIGIN_NAME;
  const originPhone = process.env.SKYDROPX_ORIGIN_PHONE;
  const originEmail = process.env.SKYDROPX_ORIGIN_EMAIL;
  const originCountry = process.env.SKYDROPX_ORIGIN_COUNTRY || "MX";
  const originState = process.env.SKYDROPX_ORIGIN_STATE;
  const originCity = process.env.SKYDROPX_ORIGIN_CITY;
  const originPostalCode = process.env.SKYDROPX_ORIGIN_POSTAL_CODE;
  const originAddressLine1 = process.env.SKYDROPX_ORIGIN_ADDRESS_LINE_1;

  // Validación mínima
  if (!apiKey || !originName || !originState || !originCity || !originPostalCode) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        "Skydropx config missing: requiere SKYDROPX_API_KEY, SKYDROPX_ORIGIN_NAME, SKYDROPX_ORIGIN_STATE, SKYDROPX_ORIGIN_CITY, SKYDROPX_ORIGIN_POSTAL_CODE",
      );
    }
    return null;
  }

  return {
    apiKey,
    isSandbox,
    origin: {
      name: originName,
      phone: originPhone || "",
      email: originEmail || "",
      country: originCountry,
      state: originState,
      city: originCity,
      postalCode: originPostalCode,
      addressLine1: originAddressLine1 || "",
    },
  };
}

/**
 * Obtiene tarifas de envío desde Skydropx
 */
export async function getSkydropxRates(
  destination: SkydropxDestination,
  pkg: SkydropxPackageInput,
): Promise<SkydropxRate[]> {
  const config = getOriginConfig();
  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getSkydropxRates] Configuración incompleta, devolviendo array vacío");
    }
    return [];
  }

  const baseUrl = config.isSandbox
    ? "https://api.sandbox.skydropx.com/v1"
    : "https://api.skydropx.com/v1";

  // Valores por defecto para dimensiones si no se proporcionan
  // 1kg, 20x20x10 cm es un default razonable para productos dentales pequeños
  const weightGrams = pkg.weightGrams || 1000;
  const lengthCm = pkg.lengthCm || 20;
  const widthCm = pkg.widthCm || 20;
  const heightCm = pkg.heightCm || 10;

  try {
    const response = await fetch(`${baseUrl}/quotations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token token=${config.apiKey}`,
      },
      body: JSON.stringify({
        address_from: {
          province: config.origin.state,
          city: config.origin.city,
          country: config.origin.country,
          zip: config.origin.postalCode,
          name: config.origin.name,
          phone: config.origin.phone || null,
          email: config.origin.email || null,
          address1: config.origin.addressLine1 || null,
        },
        address_to: {
          province: destination.state,
          city: destination.city,
          country: destination.country || "MX",
          zip: destination.postalCode,
        },
        parcels: [
          {
            weight: weightGrams,
            distance_unit: "CM",
            mass_unit: "KG",
            height: heightCm,
            width: widthCm,
            length: lengthCm,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (process.env.NODE_ENV !== "production") {
        console.error("[getSkydropxRates] Error de Skydropx:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
      }
      return [];
    }

    const data = await response.json();

    // Parsear respuesta según estructura de Skydropx
    // La respuesta típica tiene un campo "included" con las tarifas
    if (!data || !data.included || !Array.isArray(data.included)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[getSkydropxRates] Respuesta inesperada de Skydropx:", data);
      }
      return [];
    }

    const rates: SkydropxRate[] = data.included
      .map((rate: any) => {
        try {
          // Skydropx devuelve el precio en MXN como número decimal
          const totalPrice = typeof rate.total_price === "number" ? rate.total_price : 0;
          const totalPriceCents = Math.round(totalPrice * 100);

          return {
            provider: rate.attributes?.provider || rate.provider || "unknown",
            service: rate.attributes?.name || rate.name || "Standard",
            totalPriceCents,
            currency: "MXN",
            etaMinDays: rate.attributes?.delivery_time?.min || rate.delivery_time?.min || null,
            etaMaxDays: rate.attributes?.delivery_time?.max || rate.delivery_time?.max || null,
            externalRateId: rate.id || rate.attributes?.id || "",
          };
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[getSkydropxRates] Error parseando tarifa:", err, rate);
          }
          return null;
        }
      })
      .filter((r: SkydropxRate | null): r is SkydropxRate => r !== null);

    return rates;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[getSkydropxRates] Error inesperado:", error);
    }
    return [];
  }
}

/**
 * Crea un envío/guía en Skydropx a partir de una tarifa
 */
export async function createSkydropxShipment(input: {
  rateId: string;
  destination: SkydropxDestination & {
    name: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
  };
  pkg: SkydropxPackageInput;
}): Promise<{
  success: boolean;
  shipmentId?: string;
  trackingNumber?: string;
  labelUrl?: string;
  error?: string;
}> {
  const config = getOriginConfig();
  if (!config) {
    return {
      success: false,
      error: "Configuración de Skydropx incompleta",
    };
  }

  const baseUrl = config.isSandbox
    ? "https://api.sandbox.skydropx.com/v1"
    : "https://api.skydropx.com/v1";

  const weightGrams = input.pkg.weightGrams || 1000;
  const lengthCm = input.pkg.lengthCm || 20;
  const widthCm = input.pkg.widthCm || 20;
  const heightCm = input.pkg.heightCm || 10;

  try {
    const response = await fetch(`${baseUrl}/shipments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token token=${config.apiKey}`,
      },
      body: JSON.stringify({
        address_from: {
          province: config.origin.state,
          city: config.origin.city,
          country: config.origin.country,
          zip: config.origin.postalCode,
          name: config.origin.name,
          phone: config.origin.phone || null,
          email: config.origin.email || null,
          address1: config.origin.addressLine1 || null,
        },
        address_to: {
          province: input.destination.state,
          city: input.destination.city,
          country: input.destination.country || "MX",
          zip: input.destination.postalCode,
          name: input.destination.name,
          phone: input.destination.phone || null,
          email: input.destination.email || null,
          address1: input.destination.addressLine1 || null,
        },
        parcels: [
          {
            weight: weightGrams,
            distance_unit: "CM",
            mass_unit: "KG",
            height: heightCm,
            width: widthCm,
            length: lengthCm,
          },
        ],
        rate_id: input.rateId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (process.env.NODE_ENV !== "production") {
        console.error("[createSkydropxShipment] Error de Skydropx:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
      }
      return {
        success: false,
        error: `Error al crear envío: ${response.statusText}`,
      };
    }

    const data = await response.json();

    // Parsear respuesta según estructura de Skydropx
    const shipmentId = data.id || data.data?.id || "";
    const trackingNumber =
      data.tracking_number || data.data?.tracking_number || "";
    const labelUrl =
      data.label_url || data.data?.label_url || data.labels?.[0]?.url || "";

    if (!shipmentId) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[createSkydropxShipment] Respuesta sin shipmentId:", data);
      }
      return {
        success: false,
        error: "No se recibió shipmentId de Skydropx",
      };
    }

    return {
      success: true,
      shipmentId,
      trackingNumber,
      labelUrl,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[createSkydropxShipment] Error inesperado:", error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

