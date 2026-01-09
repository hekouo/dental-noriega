import "server-only";
import {
  createQuotation,
  createShipment,
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
  hasPickup: boolean; // indica si la tarifa tiene pickup disponible
};

export type SkydropxDestination = {
  postalCode: string;
  state: string;
  city: string;
  country?: string; // default "MX"
  address1?: string; // Opcional: calle/dirección de destino
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
 * (Actualizado para usar cliente OAuth y builder unificado)
 */
export async function getSkydropxRates(
  destination: SkydropxDestination,
  pkg: SkydropxPackageInput,
  options?: {
    diagnostic?: boolean;
  },
): Promise<SkydropxRate[] | { rates: SkydropxRate[]; diagnostic?: any }> {
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

  // Usar builder unificado para garantizar paridad con checkout
  const { buildSkydropxRatesRequest } = await import("./buildSkydropxRatesRequest");
  const buildResult = buildSkydropxRatesRequest({
    destination: {
      postalCode: destination.postalCode,
      state: destination.state,
      city: destination.city,
      country: destination.country,
      address1: destination.address1, // Pasar address1 si está disponible
    },
    package: {
      weightGrams: pkg.weightGrams || 1000,
      lengthCm: pkg.lengthCm,
      widthCm: pkg.widthCm,
      heightCm: pkg.heightCm,
    },
  });
  const { payload, diagnostic } = buildResult;

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
      // Si se solicita diagnóstico, incluirlo
      if (options?.diagnostic) {
        return { rates: [], diagnostic };
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
      // Log diagnóstico sin PII cuando rates está vacío (SIEMPRE, no solo en desarrollo)
      console.warn("[getSkydropxRates] skydropx_no_rates", {
        origin: {
          postal_code_present: diagnostic.origin.postal_code_present,
          city_len: diagnostic.origin.city?.length || 0,
          state_len: diagnostic.origin.state?.length || 0,
          country_code: diagnostic.origin.country_code,
        },
        destination: {
          postal_code_present: diagnostic.destination.postal_code_present,
          city_len: diagnostic.destination.city?.length || 0,
          state_len: diagnostic.destination.state?.length || 0,
          country_code: diagnostic.destination.country_code,
        },
        pkg: {
          weight_g: diagnostic.pkg.weight_g,
          length_cm: diagnostic.pkg.length_cm,
          width_cm: diagnostic.pkg.width_cm,
          height_cm: diagnostic.pkg.height_cm,
        },
      });
      // SIEMPRE devolver diagnóstico cuando se solicita y rates está vacío
      if (options?.diagnostic) {
        return { rates: [], diagnostic };
      }
      return [];
    }

    // Lista blanca de proveedores permitidos
    const ALLOWED_PROVIDERS = ["fedex", "dhl", "estafeta", "paquetexpress", "coordinadora"];
    
    // Normalizar nombre de proveedor para comparación
    const normalizeProvider = (name: string): string => {
      return name.toLowerCase().trim();
    };

    const ratesRaw = ratesArray
      .map((rate: SkydropxQuotationRate, index: number) => {
        try {
          const rateAny = rate as any;

          // Filtro 1: Verificar success (si existe en la respuesta)
          if (rateAny.success === false) {
            if (process.env.NODE_ENV !== "production") {
              console.warn(`[getSkydropxRates] Tarifa ${index} descartada: success=false`, rate);
            }
            return null;
          }

          // Filtro 2: Excluir packaging_type = 'pallet'
          if (rateAny.packaging_type === "pallet" || rateAny.package_type === "pallet") {
            if (process.env.NODE_ENV !== "production") {
              console.warn(`[getSkydropxRates] Tarifa ${index} descartada: packaging_type=pallet`, rate);
            }
            return null;
          }

          // Filtro 3: Excluir status no aplicable o sin cobertura
          const status = rateAny.status || rateAny.workflow_status;
          if (status === "not_applicable" || status === "no_coverage" || status === "unavailable") {
            if (process.env.NODE_ENV !== "production") {
              console.warn(`[getSkydropxRates] Tarifa ${index} descartada: status=${status}`, rate);
            }
            return null;
          }

          // Extraer precio: usar campos del tipo SkydropxQuotationRate
          let totalPrice = 0;
          
          if (rate.total !== undefined && rate.total !== null) {
            totalPrice = typeof rate.total === "number" ? rate.total : parseFloat(String(rate.total));
          } else {
            // Fallback a formatos legacy
            const priceFields = [
              rateAny.total_price,
              rateAny.total_pricing,
              rateAny.amount_local,
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

          // Filtro 4: Descartar tarifas con precio 0 o inválido
          if (totalPriceCents <= 0 || isNaN(totalPriceCents)) {
            if (process.env.NODE_ENV !== "production") {
              console.warn(`[getSkydropxRates] Tarifa ${index} descartada: precio inválido (${totalPriceCents} centavos)`, rate);
            }
            return null;
          }

          // Extraer provider: usar provider_name o provider_display_name
          const providerRaw = 
            rate.provider_name || 
            rate.provider_display_name || 
            rateAny.provider || 
            rateAny.carrier || 
            "unknown";
          
          const provider = normalizeProvider(providerRaw);

          // Filtro 5: Lista blanca de proveedores
          if (!ALLOWED_PROVIDERS.includes(provider)) {
            if (process.env.NODE_ENV !== "production") {
              console.warn(`[getSkydropxRates] Tarifa ${index} descartada: proveedor no permitido (${provider})`, rate);
            }
            return null;
          }

          // Extraer service: usar provider_service_name o days
          const service = 
            rate.provider_service_name || 
            rateAny.service_level_name ||
            rateAny.name || 
            rateAny.service || 
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

          // Extraer pickup (preferir tarifas con pickup)
          const hasPickup = rate.pickup === true || rate.pickup_automatic === true || rateAny.pickup === true;

          return {
            provider: providerRaw, // Mantener nombre original para display
            service,
            totalPriceCents,
            currency: "MXN",
            etaMinDays,
            etaMaxDays,
            externalRateId,
            hasPickup: hasPickup ?? false, // Agregar flag para ordenamiento
          };
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[getSkydropxRates] Error parseando tarifa ${index}:`, err, rate);
          }
          return null;
        }
      })
      .filter((r): r is SkydropxRate => r !== null && r.totalPriceCents > 0);

    if (process.env.NODE_ENV !== "production") {
      console.log("[getSkydropxRates] Total de tarifas parseadas después de filtros:", ratesRaw.length);
    }

    // Ordenar: primero por days (ETA) ASC, luego por precio ASC, preferir pickup
    ratesRaw.sort((a, b) => {
      // Preferir pickup
      if (a.hasPickup && !b.hasPickup) return -1;
      if (!a.hasPickup && b.hasPickup) return 1;
      
      // Ordenar por days (ETA) primero
      const aDays = a.etaMinDays ?? Infinity;
      const bDays = b.etaMinDays ?? Infinity;
      if (aDays !== bDays) {
        return aDays - bDays;
      }
      
      // Si tienen los mismos days, ordenar por precio
      return a.totalPriceCents - b.totalPriceCents;
    });

    // Selección curada: fastest, cheapest, recommended
    const fastestOption = ratesRaw.find((r) => r.etaMinDays !== null) || null;
    const cheapestOption = ratesRaw.length > 0 ? ratesRaw[0] : null; // Ya está ordenado por precio
    
    // Recommended: primera tarifa con days <= 3 y precio dentro del 30% del mínimo
    const minPrice = cheapestOption?.totalPriceCents ?? 0;
    const recommendedThreshold = minPrice * 1.3; // 30% más que el mínimo
    
    const recommendedOption = ratesRaw.find(
      (r) => 
        (r.etaMinDays !== null && r.etaMinDays <= 3) &&
        r.totalPriceCents <= recommendedThreshold
    ) || fastestOption || cheapestOption;

    // Construir array final: recommended, fastest, cheapest, y otras razonables (máximo 5)
    const selectedRates: SkydropxRate[] = [];
    const seenIds = new Set<string>();

    // Agregar recommended primero (si existe y no está duplicado)
    if (recommendedOption && !seenIds.has(recommendedOption.externalRateId)) {
      selectedRates.push(recommendedOption);
      seenIds.add(recommendedOption.externalRateId);
    }

    // Agregar fastest (si es diferente de recommended)
    if (fastestOption && !seenIds.has(fastestOption.externalRateId)) {
      selectedRates.push(fastestOption);
      seenIds.add(fastestOption.externalRateId);
    }

    // Agregar cheapest (si es diferente)
    if (cheapestOption && !seenIds.has(cheapestOption.externalRateId)) {
      selectedRates.push(cheapestOption);
      seenIds.add(cheapestOption.externalRateId);
    }

    // Agregar otras opciones razonables hasta llegar a 5 máximo
    for (const rate of ratesRaw) {
      if (selectedRates.length >= 5) break;
      if (!seenIds.has(rate.externalRateId)) {
        selectedRates.push(rate);
        seenIds.add(rate.externalRateId);
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[getSkydropxRates] Selección curada:", {
        total: ratesRaw.length,
        selected: selectedRates.length,
        recommended: recommendedOption?.externalRateId,
        fastest: fastestOption?.externalRateId,
        cheapest: cheapestOption?.externalRateId,
      });
    }

    // Si no hay tarifas después de selección, log y devolver con diagnóstico
    if (selectedRates.length === 0) {
      // Log diagnóstico sin PII cuando rates está vacío después de selección (SIEMPRE)
      console.warn("[getSkydropxRates] skydropx_no_rates (después de selección)", {
        origin: {
          postal_code_present: diagnostic.origin.postal_code_present,
          city_len: diagnostic.origin.city?.length || 0,
          state_len: diagnostic.origin.state?.length || 0,
          country_code: diagnostic.origin.country_code,
        },
        destination: {
          postal_code_present: diagnostic.destination.postal_code_present,
          city_len: diagnostic.destination.city?.length || 0,
          state_len: diagnostic.destination.state?.length || 0,
          country_code: diagnostic.destination.country_code,
        },
        pkg: {
          weight_g: diagnostic.pkg.weight_g,
          length_cm: diagnostic.pkg.length_cm,
          width_cm: diagnostic.pkg.width_cm,
          height_cm: diagnostic.pkg.height_cm,
        },
      });
      // SIEMPRE devolver diagnóstico cuando se solicita y rates está vacío
      if (options?.diagnostic) {
        return { rates: [], diagnostic };
      }
      return [];
    }

    // Si se solicitó diagnóstico, devolverlo junto con rates (aunque rates no esté vacío)
    if (options?.diagnostic) {
      return { rates: selectedRates, diagnostic };
    }

    return selectedRates;
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
        // Si se solicita diagnóstico, incluirlo
        if (options?.diagnostic) {
          return { rates: [], diagnostic };
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
    // Si se solicita diagnóstico, incluirlo
    if (options?.diagnostic) {
      return { rates: [], diagnostic };
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
    const sanitizePhone = (v?: string | null) => {
      if (!v) return null;
      const digits = v.replace(/\D/g, "");
      if (!digits) return null;
      const withoutCountry =
        digits.length === 12 && digits.startsWith("52") ? digits.slice(2) : digits;
      if (withoutCountry.length > 10) return withoutCountry.slice(-10);
      return withoutCountry;
    };

    const payload: SkydropxShipmentPayload = {
      shipment: {
        rate_id: input.rateId,
        address_from: {
          country: config.origin.country || "MX",
          country_code: config.origin.country || "MX",
          zip: config.origin.postalCode,
          postal_code: config.origin.postalCode,
          city: config.origin.city,
          state: config.origin.state,
          province: config.origin.state,
          street1: config.origin.addressLine1 || "",
          address1: config.origin.addressLine1 || "",
          name: config.origin.name,
          company: "DDN",
          reference: "Sin referencia",
          phone: sanitizePhone(config.origin.phone) || null,
          email: config.origin.email || null,
        },
        address_to: {
          country: input.destination.country || "MX",
          country_code: input.destination.country || "MX",
          zip: input.destination.postalCode,
          postal_code: input.destination.postalCode,
          city: input.destination.city,
          state: input.destination.state,
          province: input.destination.state,
          street1: input.destination.addressLine1 || "",
          address1: input.destination.addressLine1 || "",
          name: input.destination.name || "Cliente",
          company: "Particular",
          reference: "Sin referencia",
          phone: sanitizePhone(input.destination.phone) || null,
          email: input.destination.email || null,
        },
        packages: [
          {
            package_number: "1",
            package_protected: false,
            weight: weightKg,
            height: heightCm,
            width: widthCm,
            length: lengthCm,
            consignment_note: process.env.SKYDROPX_DEFAULT_CONSIGNMENT_NOTE || "",
            package_type: process.env.SKYDROPX_DEFAULT_PACKAGE_TYPE || "",
          },
        ],
        declared_value: 0,
        printing_format: "standard",
      },
    };

    // Agregar productos si están disponibles
    if (input.products && input.products.length > 0) {
      payload.shipment.products = input.products;
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

