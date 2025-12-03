import "server-only";
import {
  createQuotation,
  createShipment,
  type SkydropxQuotationPayload,
  type SkydropxQuotationRate,
  type SkydropxShipmentPayload,
  type SkydropxShipmentResponse,
} from "@/lib/skydropx/client";

/**
 * Tipos para la integración con Skydropx
 * (Mantener compatibilidad con código existente)
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
 * Tipo para la configuración de origen
 */
type OriginConfig = {
  name: string;
  phone: string;
  email: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  addressLine1: string;
};

/**
 * Tipo para la configuración completa de Skydropx (solo OAuth)
 */
type SkydropxAuthConfig = {
  authType: "oauth";
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  origin: OriginConfig;
};

/**
 * Obtiene la configuración completa de Skydropx (autenticación + origen)
 * Prioriza OAuth si está disponible, sino usa API key
 */
export function getSkydropxConfig(): SkydropxAuthConfig | null {
  // Verificar si está habilitado Skydropx
  const enableSkydropx = process.env.ENABLE_SKYDROPX_SHIPPING !== "false"; // default true si no está definido
  if (!enableSkydropx) {
    return null;
  }

  // Verificar datos de origen (requeridos en ambos casos)
  const originName = process.env.SKYDROPX_ORIGIN_NAME;
  const originPhone = process.env.SKYDROPX_ORIGIN_PHONE;
  const originEmail = process.env.SKYDROPX_ORIGIN_EMAIL;
  const originCountry = process.env.SKYDROPX_ORIGIN_COUNTRY || "MX";
  const originState = process.env.SKYDROPX_ORIGIN_STATE;
  const originCity = process.env.SKYDROPX_ORIGIN_CITY;
  const originPostalCode = process.env.SKYDROPX_ORIGIN_POSTAL_CODE;
  const originAddressLine1 = process.env.SKYDROPX_ORIGIN_ADDRESS_LINE_1;

  // Validación mínima de datos de origen
  if (!originName || !originState || !originCity || !originPostalCode) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[getSkydropxConfig] Datos de origen incompletos: requiere SKYDROPX_ORIGIN_NAME, SKYDROPX_ORIGIN_STATE, SKYDROPX_ORIGIN_CITY, SKYDROPX_ORIGIN_POSTAL_CODE",
      );
    }
    return null;
  }

  const origin: OriginConfig = {
    name: originName,
    phone: originPhone || "",
    email: originEmail || "",
    country: originCountry,
    state: originState,
    city: originCity,
    postalCode: originPostalCode,
    addressLine1: originAddressLine1 || "",
  };

  // URL base de la API de Skydropx
  const baseUrl = process.env.SKYDROPX_BASE_URL || "https://api.skydropx.com";

  // Verificar credenciales OAuth (requeridas)
  const clientId = process.env.SKYDROPX_CLIENT_ID;
  const clientSecret = process.env.SKYDROPX_CLIENT_SECRET;

  // Si hay OAuth credentials (y no están vacíos), usarlas
  if (clientId && clientSecret && clientId.trim() !== "" && clientSecret.trim() !== "") {
    if (process.env.NODE_ENV !== "production") {
      console.log("[getSkydropxConfig] Usando autenticación OAuth");
    }
    return {
      authType: "oauth",
      baseUrl,
      clientId,
      clientSecret,
      origin,
    };
  }

  // Si no hay credenciales OAuth
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[getSkydropxConfig] Skydropx sin credenciales: requiere SKYDROPX_CLIENT_ID y SKYDROPX_CLIENT_SECRET",
    );
  }
  return null;
}


/**
 * Obtiene tarifas de envío desde Skydropx
 * (Actualizado para usar cliente OAuth)
 */
export async function getSkydropxRates(
  destination: SkydropxDestination,
  pkg: SkydropxPackageInput,
): Promise<SkydropxRate[]> {
  const config = getSkydropxConfig();
  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getSkydropxRates] Configuración incompleta, devolviendo array vacío");
    }
    return [];
  }

  // Log del método de autenticación usado
  if (process.env.NODE_ENV !== "production") {
    console.log("[getSkydropxRates] Usando autenticación: OAuth");
  }

  // Valores por defecto para dimensiones si no se proporcionan
  // 1kg, 20x20x10 cm es un default razonable para productos dentales pequeños
  const weightGrams = pkg.weightGrams || 1000;
  const weightKg = weightGrams / 1000; // Convertir gramos a kilogramos
  const lengthCm = pkg.lengthCm || 20;
  const widthCm = pkg.widthCm || 20;
  const heightCm = pkg.heightCm || 10;

  const payload: SkydropxQuotationPayload = {
    address_from: {
      state: config.origin.state, // Usar state para area_level1
      province: config.origin.state, // Mantener province como fallback
      city: config.origin.city,
      country: config.origin.country,
      zip: config.origin.postalCode,
      neighborhood: config.origin.addressLine1 
        ? config.origin.addressLine1.split(",")[0] 
        : undefined, // Intentar extraer colonia de addressLine1
      name: config.origin.name,
      phone: config.origin.phone || null,
      email: config.origin.email || null,
      address1: config.origin.addressLine1 || null,
    },
    address_to: {
      state: destination.state, // Usar state para area_level1
      province: destination.state, // Mantener province como fallback
      city: destination.city,
      country: destination.country || "MX",
      zip: destination.postalCode,
      // neighborhood no está disponible en destination, se usará city como fallback
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

  // Logging controlado: solo en desarrollo y sin exponer datos sensibles
  if (process.env.NODE_ENV !== "production") {
    console.log("[getSkydropxRates] Solicitando tarifas para:", {
      destination: `${payload.address_to.zip}, ${payload.address_to.city}`,
      weight_kg: payload.parcels[0]?.weight || 0,
    });
  }

  try {
    const result = await createQuotation(payload);
    
    // Si el resultado indica error controlado, devolver array vacío sin lanzar excepción
    if (!result.ok) {
      if (process.env.NODE_ENV !== "production") {
        if (result.code === "invalid_params" || result.code === "no_coverage") {
          console.warn("[getSkydropxRates] Sin cobertura o parámetros inválidos:", {
            code: result.code,
            message: result.message,
          });
        } else {
          console.error("[getSkydropxRates] Error de Skydropx:", {
            code: result.code,
            message: result.message,
          });
        }
      }
      return []; // Devolver array vacío sin romper el flujo
    }
    
    const data = result.data;

    // Logging controlado: solo información esencial en desarrollo
    if (process.env.NODE_ENV !== "production") {
      const dataType = Array.isArray(data) ? "array" : typeof data;
      const dataKeys = data && !Array.isArray(data) ? Object.keys(data) : [];
      console.log("[getSkydropxRates] Respuesta recibida:", {
        format: dataType,
        keys: dataKeys.length > 0 ? dataKeys : undefined,
      });
    }

    // Parsear respuesta según múltiples formatos posibles de Skydropx
    let ratesArray: SkydropxQuotationRate[] = [];

    // Caso 1: data es un array directo (formato simple)
    if (Array.isArray(data)) {
      ratesArray = data as SkydropxQuotationRate[];
      if (process.env.NODE_ENV !== "production") {
        console.log("[getSkydropxRates] Formato: array directo, encontradas", ratesArray.length, "tarifas");
      }
    }
    // Caso 2: data.data es un array (JSON:API o formato anidado)
    else if (data?.data && Array.isArray(data.data)) {
      ratesArray = data.data as SkydropxQuotationRate[];
      if (process.env.NODE_ENV !== "production") {
        console.log("[getSkydropxRates] Formato: data.data array, encontradas", ratesArray.length, "tarifas");
      }
    }
    // Caso 3: data.included es un array (JSON:API)
    else if (data?.included && Array.isArray(data.included)) {
      ratesArray = data.included as SkydropxQuotationRate[];
      if (process.env.NODE_ENV !== "production") {
        console.log("[getSkydropxRates] Formato: data.included array, encontradas", ratesArray.length, "tarifas");
      }
    }
    // Caso 4: data puede tener otros campos con arrays (explorar)
    else if (data && typeof data === "object") {
      // Buscar cualquier propiedad que sea un array
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key as keyof typeof data])) {
          ratesArray = data[key as keyof typeof data] as SkydropxQuotationRate[];
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
      .map((rate: SkydropxQuotationRate, index: number) => {
        try {
          if (process.env.NODE_ENV !== "production" && index === 0) {
            console.log("[getSkydropxRates] Ejemplo de tarifa (primera):", JSON.stringify(rate, null, 2));
          }

          // Extraer precio: usar campos del tipo SkydropxQuotationRate
          // - total (número en MXN)
          // - También soportar formatos legacy
          let totalPrice = 0;
          
          if (rate.total !== undefined && rate.total !== null) {
            totalPrice = typeof rate.total === "number" ? rate.total : parseFloat(String(rate.total));
          } else {
            // Fallback a formatos legacy
            const priceFields = [
              (rate as any).total_price,
              (rate as any).total_pricing,
              (rate as any).amount_local,
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

          // Extraer provider: usar provider_name o provider_display_name
          const provider = 
            rate.provider_name || 
            rate.provider_display_name || 
            (rate as any).provider || 
            (rate as any).carrier || 
            "unknown";

          // Extraer service: usar provider_service_name o days
          const service = 
            rate.provider_service_name || 
            (rate as any).service_level_name ||
            (rate as any).name || 
            (rate as any).service || 
            "Standard";

          // Extraer ID
          const externalRateId = rate.id || String(index);

          // Extraer days: usar days directamente
          let etaMinDays: number | null = null;
          let etaMaxDays: number | null = null;

          if (rate.days !== undefined && rate.days !== null) {
            const days = typeof rate.days === "number" ? rate.days : parseFloat(String(rate.days));
            if (!isNaN(days) && days > 0) {
              etaMinDays = Math.floor(days);
              etaMaxDays = Math.ceil(days);
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
    
    // Si es un error de autenticación, lanzarlo para que la API route lo maneje
    if (error instanceof Error) {
      // Error especial de "parámetros inválidos" → tratar como sin cobertura, no error fatal
      if (error.message === "skydropx_invalid_params") {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[getSkydropxRates] Parámetros inválidos o sin cobertura para esta ruta, devolviendo array vacío");
        }
        return []; // Sin cobertura = sin tarifas, no es un error fatal
      }
      
      if (error.message.includes("auth") || error.message.includes("401") || error.message.includes("403")) {
        throw new Error("skydropx_auth_error");
      }
      if (error.message.includes("fetch") || error.message.includes("network")) {
        throw new Error("skydropx_fetch_error");
      }
    }
    
    // Para otros errores, devolver array vacío (sin cobertura o error no crítico)
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getSkydropxRates] Error no crítico, devolviendo array vacío (sin tarifas)");
    }
    return [];
  }
}

/**
 * Crea un envío/guía en Skydropx a partir de una tarifa
 * (Actualizado para usar cliente OAuth)
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
  products?: Array<{
    name: string;
    sku?: string;
    price?: number;
    quantity?: number;
  }>;
}): Promise<{
  success: boolean;
  shipmentId?: string;
  trackingNumber?: string;
  labelUrl?: string;
  carrierName?: string;
  workflowStatus?: string;
  paymentStatus?: string;
  total?: number;
  packages?: Array<{
    id?: string;
    trackingNumber?: string;
    labelUrl?: string;
  }>;
  error?: string;
}> {
  const config = getSkydropxConfig();
  if (!config) {
    return {
      success: false,
      error: "Configuración de Skydropx incompleta",
    };
  }

  // Log del método de autenticación usado
  if (process.env.NODE_ENV !== "production") {
    console.log("[createSkydropxShipment] Usando autenticación: OAuth");
  }

  const weightGrams = input.pkg.weightGrams || 1000;
  const weightKg = weightGrams / 1000; // Convertir gramos a kilogramos
  const lengthCm = input.pkg.lengthCm || 20;
  const widthCm = input.pkg.widthCm || 20;
  const heightCm = input.pkg.heightCm || 10;

  try {
    const payload: SkydropxShipmentPayload = {
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
    };

    // Agregar productos si están disponibles
    if (input.products && input.products.length > 0) {
      payload.products = input.products;
    }

    const data = await createShipment(payload);

    // Parsear respuesta según estructura de SkydropxShipmentResponse
    const shipmentId = data.id || data.data?.id || "";
    const trackingNumber =
      data.master_tracking_number || data.data?.master_tracking_number || "";
    const labelUrl = extractLabelUrl(data);
    const carrierName = data.carrier_name || data.data?.carrier_name || "";
    const workflowStatus = data.workflow_status || data.data?.workflow_status || "";
    const paymentStatus = data.payment_status || data.data?.payment_status || "";
    const total = data.total || data.data?.total;

    // Extraer paquetes de included o relationships
    const packages = extractPackages(data);

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
      carrierName,
      workflowStatus,
      paymentStatus,
      total,
      packages,
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

/**
 * Extrae la URL de la etiqueta desde la respuesta de Skydropx
 */
function extractLabelUrl(data: SkydropxShipmentResponse): string {
  // Buscar en included
  if (data.included && Array.isArray(data.included)) {
    for (const pkg of data.included) {
      if (pkg.label_url) {
        return pkg.label_url;
      }
    }
  }

  // Buscar en data.data
  if (data.data?.relationships?.packages?.data && data.included) {
    const packageIds = data.data.relationships.packages.data.map((p) => p.id);
    for (const pkgId of packageIds) {
      const pkg = data.included.find((p) => p.id === pkgId);
      if (pkg?.label_url) {
        return pkg.label_url;
      }
    }
  }

  // Fallback a campos directos
  return (data as any).label_url || "";
}

/**
 * Extrae los paquetes desde la respuesta de Skydropx
 */
function extractPackages(data: SkydropxShipmentResponse): Array<{
  id?: string;
  trackingNumber?: string;
  labelUrl?: string;
}> {
  const packages: Array<{
    id?: string;
    trackingNumber?: string;
    labelUrl?: string;
  }> = [];

  if (data.included && Array.isArray(data.included)) {
    for (const pkg of data.included) {
      packages.push({
        id: pkg.id,
        trackingNumber: pkg.tracking_number,
        labelUrl: pkg.label_url,
      });
    }
  }

  return packages;
}

