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
    ? "https://api-demo.skydropx.com/v1"
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
      
      // Retornar error específico según el status para que la API route pueda manejarlo
      if (response.status === 401 || response.status === 403) {
        throw new Error("skydropx_auth_error");
      }
      throw new Error("skydropx_fetch_error");
    }

    const data = await response.json();

    // Logging temporal en desarrollo para inspeccionar la respuesta real
    if (process.env.NODE_ENV !== "production") {
      const jsonStr = JSON.stringify(data);
      console.log("[getSkydropxRates] Raw response from Skydropx:", {
        status: response.status,
        statusText: response.statusText,
        jsonSample: jsonStr.slice(0, 2000),
        jsonLength: jsonStr.length,
        dataType: Array.isArray(data) ? "array" : typeof data,
        dataKeys: data && !Array.isArray(data) ? Object.keys(data) : [],
      });
    }

    // Parsear respuesta según múltiples formatos posibles de Skydropx
    let ratesArray: unknown[] = [];

    // Caso 1: data es un array directo (formato simple)
    if (Array.isArray(data)) {
      ratesArray = data;
      if (process.env.NODE_ENV !== "production") {
        console.log("[getSkydropxRates] Formato: array directo, encontradas", ratesArray.length, "tarifas");
      }
    }
    // Caso 2: data.data es un array (JSON:API o formato anidado)
    else if (data?.data && Array.isArray(data.data)) {
      ratesArray = data.data;
      if (process.env.NODE_ENV !== "production") {
        console.log("[getSkydropxRates] Formato: data.data array, encontradas", ratesArray.length, "tarifas");
      }
    }
    // Caso 3: data.included es un array (JSON:API)
    else if (data?.included && Array.isArray(data.included)) {
      ratesArray = data.included;
      if (process.env.NODE_ENV !== "production") {
        console.log("[getSkydropxRates] Formato: data.included array, encontradas", ratesArray.length, "tarifas");
      }
    }
    // Caso 4: data puede tener otros campos con arrays (explorar)
    else if (data && typeof data === "object") {
      // Buscar cualquier propiedad que sea un array
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key as keyof typeof data])) {
          ratesArray = data[key as keyof typeof data] as unknown[];
          if (process.env.NODE_ENV !== "production") {
            console.log(`[getSkydropxRates] Formato: data.${key} array, encontradas`, ratesArray.length, "tarifas");
          }
          break;
        }
      }
    }

    if (ratesArray.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[getSkydropxRates] No se encontraron tarifas en la respuesta. Estructura completa:", JSON.stringify(data, null, 2));
      }
      return [];
    }

    const rates: SkydropxRate[] = ratesArray
      .map((rate: any, index: number) => {
        try {
          if (process.env.NODE_ENV !== "production" && index === 0) {
            console.log("[getSkydropxRates] Ejemplo de tarifa (primera):", JSON.stringify(rate, null, 2));
          }

          // Extraer precio: soporta múltiples formatos
          // - total_price, total_pricing, amount_local
          // - En attributes o directamente
          // - Como number o string
          let totalPrice = 0;
          
          // Intentar diferentes campos de precio
          const priceFields = [
            rate.total_price,
            rate.total_pricing,
            rate.amount_local,
            rate.attributes?.total_price,
            rate.attributes?.total_pricing,
            rate.attributes?.amount_local,
          ];

          for (const priceField of priceFields) {
            if (priceField !== undefined && priceField !== null) {
              const num = typeof priceField === "number" ? priceField : parseFloat(String(priceField));
              if (!isNaN(num) && num > 0) {
                totalPrice = num;
                break;
              }
            }
          }

          // Normalizar precio a centavos
          const totalPriceCents = Math.round(totalPrice * 100);

          // Descartar tarifas con precio 0 o inválido
          if (totalPriceCents <= 0 || isNaN(totalPriceCents)) {
            if (process.env.NODE_ENV !== "production") {
              console.warn(`[getSkydropxRates] Tarifa ${index} descartada: precio inválido (${totalPriceCents} centavos)`, rate);
            }
            return null;
          }

          // Extraer provider: soporta múltiples formatos
          const provider = 
            rate.attributes?.provider || 
            rate.provider || 
            rate.carrier || 
            rate.attributes?.carrier || 
            "unknown";

          // Extraer service/name: soporta múltiples formatos
          const service = 
            rate.attributes?.name || 
            rate.attributes?.service_level_name ||
            rate.service_level_name ||
            rate.name || 
            rate.service || 
            "Standard";

          // Extraer ID
          const externalRateId = 
            rate.id || 
            rate.attributes?.id || 
            rate.rate_id ||
            rate.attributes?.rate_id ||
            String(index);

          // Extraer delivery time: soporta múltiples formatos
          const deliveryTime = 
            rate.attributes?.delivery_time || 
            rate.delivery_time ||
            rate.attributes?.delivery_range ||
            rate.delivery_range;
          
          let etaMinDays: number | null = null;
          let etaMaxDays: number | null = null;

          if (deliveryTime) {
            if (typeof deliveryTime === "object") {
              etaMinDays = deliveryTime.min ?? deliveryTime.min_days ?? null;
              etaMaxDays = deliveryTime.max ?? deliveryTime.max_days ?? null;
            } else if (typeof deliveryTime === "number") {
              etaMinDays = deliveryTime;
              etaMaxDays = deliveryTime;
            }
          }

          if (process.env.NODE_ENV !== "production" && index === 0) {
            console.log("[getSkydropxRates] Tarifa parseada:", {
              provider,
              service,
              totalPriceCents,
              totalPrice,
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
            console.warn(`[getSkydropxRates] Error parseando tarifa ${index}:`, err, rate);
          }
          return null;
        }
      })
      .filter((r: SkydropxRate | null): r is SkydropxRate => r !== null && r.totalPriceCents > 0)
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
    ? "https://api-demo.skydropx.com/v1"
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

