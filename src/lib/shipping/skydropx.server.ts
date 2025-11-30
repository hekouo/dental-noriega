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
  const weightKg = weightGrams / 1000; // Convertir gramos a kilogramos
  const lengthCm = pkg.lengthCm || 20;
  const widthCm = pkg.widthCm || 20;
  const heightCm = pkg.heightCm || 10;

  const payload = {
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
        weight: weightKg, // En kilogramos, no gramos
        distance_unit: "CM",
        mass_unit: "KG",
        height: heightCm,
        width: widthCm,
        length: lengthCm,
      },
    ],
  };

  if (process.env.NODE_ENV !== "production") {
    console.log("[getSkydropxRates] Payload a Skydropx (sin API key):", {
      ...payload,
      address_from: {
        ...payload.address_from,
        // No loguear API key
      },
    });
  }

  try {
    const response = await fetch(`${baseUrl}/quotations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token token=${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorBody: unknown = null;
      try {
        errorBody = JSON.parse(errorText);
      } catch {
        // Si no es JSON, usar el texto tal cual
        errorBody = errorText;
      }
      
      if (process.env.NODE_ENV !== "production") {
        console.error("[getSkydropxRates] Error de Skydropx:", {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          url: `${baseUrl}/quotations`,
        });
      }
      return [];
    }

    const data = await response.json();

    if (process.env.NODE_ENV !== "production") {
      console.log("[getSkydropxRates] Respuesta de Skydropx (estructura):", {
        hasData: !!data,
        hasDataData: !!data?.data,
        hasIncluded: !!data?.included,
        dataKeys: data ? Object.keys(data) : [],
        dataDataType: data?.data ? (Array.isArray(data.data) ? "array" : typeof data.data) : "none",
        includedType: data?.included ? (Array.isArray(data.included) ? "array" : typeof data.included) : "none",
        includedLength: Array.isArray(data?.included) ? data.included.length : 0,
        dataDataLength: Array.isArray(data?.data) ? data.data.length : 0,
      });
    }

    // Parsear respuesta según estructura de Skydropx
    // Skydropx puede devolver las tarifas en data.data o data.included
    let ratesArray: unknown[] = [];

    if (data?.data && Array.isArray(data.data)) {
      ratesArray = data.data;
      if (process.env.NODE_ENV !== "production") {
        console.log("[getSkydropxRates] Usando data.data, encontradas", ratesArray.length, "tarifas");
      }
    } else if (data?.included && Array.isArray(data.included)) {
      ratesArray = data.included;
      if (process.env.NODE_ENV !== "production") {
        console.log("[getSkydropxRates] Usando data.included, encontradas", ratesArray.length, "tarifas");
      }
    } else {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[getSkydropxRates] Respuesta inesperada de Skydropx, estructura completa:", JSON.stringify(data, null, 2));
      }
      return [];
    }

    const rates: SkydropxRate[] = ratesArray
      .map((rate: any, index: number) => {
        try {
          if (process.env.NODE_ENV !== "production" && index === 0) {
            console.log("[getSkydropxRates] Ejemplo de tarifa (primera):", JSON.stringify(rate, null, 2));
          }

          // Skydropx puede devolver el precio como número decimal o string
          let totalPrice = 0;
          if (typeof rate.total_price === "number") {
            totalPrice = rate.total_price;
          } else if (typeof rate.total_price === "string") {
            totalPrice = parseFloat(rate.total_price) || 0;
          } else if (rate.attributes?.total_price !== undefined) {
            totalPrice = typeof rate.attributes.total_price === "number"
              ? rate.attributes.total_price
              : parseFloat(String(rate.attributes.total_price)) || 0;
          }

          const totalPriceCents = Math.round(totalPrice * 100);

          // Extraer provider
          const provider = rate.attributes?.provider || rate.provider || "unknown";

          // Extraer service/name
          const service = rate.attributes?.name || rate.name || rate.service || "Standard";

          // Extraer ID
          const externalRateId = rate.id || rate.attributes?.id || String(index);

          // Extraer delivery time
          const deliveryTime = rate.attributes?.delivery_time || rate.delivery_time;
          const etaMinDays = deliveryTime?.min ?? null;
          const etaMaxDays = deliveryTime?.max ?? null;

          if (process.env.NODE_ENV !== "production" && index === 0) {
            console.log("[getSkydropxRates] Tarifa parseada:", {
              provider,
              service,
              totalPriceCents,
              externalRateId,
              etaMinDays,
              etaMaxDays,
            });
          }

          return {
            provider,
            service,
            totalPriceCents,
            currency: "MXN",
            etaMinDays,
            etaMaxDays,
            externalRateId,
          };
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[getSkydropxRates] Error parseando tarifa:", err, rate);
          }
          return null;
        }
      })
      .filter((r: SkydropxRate | null): r is SkydropxRate => r !== null)
      .sort((a, b) => a.totalPriceCents - b.totalPriceCents); // Ordenar por precio ASC

    if (process.env.NODE_ENV !== "production") {
      console.log("[getSkydropxRates] Total de tarifas parseadas:", rates.length);
    }

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
  const weightKg = weightGrams / 1000; // Convertir gramos a kilogramos
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
            weight: weightKg, // En kilogramos, no gramos
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

