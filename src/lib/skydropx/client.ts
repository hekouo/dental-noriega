import "server-only";

/**
 * Cliente Skydropx con autenticación OAuth y caché de tokens
 */

type OAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  created_at?: number;
};

type CachedToken = {
  accessToken: string;
  expiresAt: number; // timestamp en ms
};

// Caché en memoria del token (por proceso)
let tokenCache: CachedToken | null = null;

/**
 * Obtiene la configuración de Skydropx desde env vars
 * Usa OAuth exclusivamente
 */
function getSkydropxConfig() {
  const clientId = process.env.SKYDROPX_CLIENT_ID;
  const clientSecret = process.env.SKYDROPX_CLIENT_SECRET;
  
  // URL base para autenticación OAuth (para /api/v1/oauth/token)
  // OAuth sigue usando api-pro según la configuración actual
  const authBaseUrl = process.env.SKYDROPX_AUTH_BASE_URL || "https://api-pro.skydropx.com";
  
  // URL base para cotizaciones (para /api/v1/quotations)
  // Actualmente usa api-pro.skydropx.com según la configuración del usuario
  const quotationsBaseUrl = process.env.SKYDROPX_QUOTATIONS_BASE_URL || "https://api-pro.skydropx.com";
  
  // URL base para otros endpoints de API (shipments, etc.)
  const restBaseUrl = process.env.SKYDROPX_BASE_URL || "https://api.skydropx.com";

  if (!clientId || !clientSecret) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        "Skydropx config missing: requiere SKYDROPX_CLIENT_ID y SKYDROPX_CLIENT_SECRET",
      );
    }
    return null;
  }

  return {
    clientId,
    clientSecret,
    authBaseUrl, // Para endpoint de OAuth (api-pro)
    quotationsBaseUrl, // Para endpoint de cotizaciones (app)
    restBaseUrl, // Para otros endpoints de API
  };
}

/**
 * Obtiene un token de acceso OAuth desde Skydropx
 * Usa grant_type=client_credentials
 */
async function fetchAccessToken(): Promise<string | null> {
  const config = getSkydropxConfig();
  if (!config) {
    return null;
  }

  try {
    // URL del token: puede venir de env o construirse desde authBaseUrl
    let tokenUrl: string;
    if (process.env.SKYDROPX_OAUTH_TOKEN_URL) {
      tokenUrl = process.env.SKYDROPX_OAUTH_TOKEN_URL;
    } else {
      // Construir URL desde authBaseUrl, limpiando slashes dobles
      const baseUrl = config.authBaseUrl.replace(/\/$/, ""); // Quitar trailing slash
      tokenUrl = `${baseUrl}/oauth/token`;
    }
    
    if (process.env.NODE_ENV !== "production") {
      console.log("[Skydropx OAuth] Obteniendo token desde:", tokenUrl);
    }
    
    // Usar application/x-www-form-urlencoded como especifica OAuth 2.0
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorBody: string | unknown = "";
      
      // Intentar leer como texto primero
      const errorText = await response.text();
      
      // Si es JSON, parsearlo; si no, usar el texto tal cual
      if (contentType?.includes("application/json")) {
        try {
          errorBody = JSON.parse(errorText);
        } catch {
          errorBody = errorText;
        }
      } else {
        errorBody = errorText;
        // Si es HTML, truncar para no llenar logs
        if (typeof errorBody === "string" && errorBody.includes("<!DOCTYPE")) {
          errorBody = errorBody.slice(0, 500) + "... (HTML truncado)";
        }
      }
      
      // Logs mejorados para depuración
      if (process.env.NODE_ENV !== "production") {
        console.error("[Skydropx OAuth] Error obteniendo token:", {
          url: tokenUrl,
          status: response.status,
          statusText: response.statusText,
          contentType,
          body: errorBody,
        });
      }
      
      // Lanzar error descriptivo si es necesario
      if (response.status === 401 || response.status === 403) {
        throw new Error("Credenciales de Skydropx inválidas. Verifica SKYDROPX_CLIENT_ID y SKYDROPX_CLIENT_SECRET");
      }
      
      return null;
    }

    // Verificar que la respuesta sea JSON antes de parsear
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      if (process.env.NODE_ENV !== "production") {
        console.error("[Skydropx OAuth] Respuesta no es JSON:", {
          url: tokenUrl,
          contentType,
          body: text.slice(0, 500),
        });
      }
      return null;
    }

    const data = (await response.json()) as OAuthTokenResponse;

    if (!data.access_token) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Skydropx OAuth] Respuesta sin access_token:", data);
      }
      return null;
    }

    // Calcular fecha de expiración (con margen de 60 segundos para evitar race conditions)
    const expiresIn = data.expires_in || 3600; // default 1 hora
    const expiresAt = Date.now() + (expiresIn - 60) * 1000;

    // Actualizar caché
    tokenCache = {
      accessToken: data.access_token,
      expiresAt,
    };

    if (process.env.NODE_ENV !== "production") {
      console.log("[Skydropx OAuth] Token obtenido, expira en", expiresIn, "segundos");
    }

    return data.access_token;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[Skydropx OAuth] Error inesperado obteniendo token:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    // Si el error ya tiene mensaje descriptivo, propagarlo
    if (error instanceof Error && error.message.includes("Credenciales")) {
      throw error;
    }
    return null;
  }
}

/**
 * Obtiene un token de acceso válido (usa caché si está disponible y no expiró)
 */
async function getAccessToken(): Promise<string | null> {
  // Verificar si hay token en caché y no ha expirado
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  // Si no hay token o expiró, obtener uno nuevo
  return await fetchAccessToken();
}

/**
 * Función genérica para hacer requests a la API de Skydropx
 * Maneja automáticamente la autenticación OAuth
 * 
 * Hardening: Si falla 404 con api-pro y el path es /v1/shipments, reintenta con api.skydropx.com
 */
export async function skydropxFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const config = getSkydropxConfig();
  if (!config) {
    throw new Error("Skydropx no está configurado");
  }

  // Construir URL completa usando restBaseUrl (API)
  const url = `${config.restBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  // Log seguro de URL (sin secretos)
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[Skydropx] Request:",
      {
        method: options.method ?? "GET",
        path,
        baseUrl: config.restBaseUrl,
        fullUrl: url,
      },
    );
  }

  // Headers por defecto
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  
  // OAuth: obtener token de acceso
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso de Skydropx. Verifica las credenciales OAuth.");
  }
  headers.set("Authorization", `Bearer ${accessToken}`);

  // Hacer el request
  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Hardening: Si recibimos 404 y estamos usando api-pro para shipments, reintentar con api.skydropx.com
  if (
    response.status === 404 &&
    config.restBaseUrl.includes("api-pro") &&
    path.includes("/v1/shipments")
  ) {
    const fallbackBaseUrl = "https://api.skydropx.com";
    const fallbackUrl = `${fallbackBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    
    console.warn(
      "[Skydropx] 404 con api-pro, reintentando con api.skydropx.com:",
      {
        originalUrl: url,
        fallbackUrl,
        path,
      },
    );
    
    response = await fetch(fallbackUrl, {
      ...options,
      headers,
    });
  }

  // Si recibimos 401, el token puede haber expirado, intentar refrescar una vez
  if (response.status === 401) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Skydropx] Token expirado, intentando refrescar...");
    }
    // Limpiar caché y obtener nuevo token
    tokenCache = null;
    const newToken = await fetchAccessToken();
    if (newToken) {
      // Reintentar con nuevo token
      headers.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(url, {
        ...options,
        headers,
      });
    }
  }

  return response;
}

/**
 * Tipos para cotizaciones de Skydropx
 */
export type SkydropxQuotationPayload = {
  address_from: {
    province?: string;
    state?: string; // Alias para province
    city: string;
    country: string;
    zip: string;
    neighborhood?: string; // Para area_level3
    name?: string;
    phone?: string | null;
    email?: string | null;
    address1?: string | null;
  };
  address_to: {
    province?: string;
    state?: string; // Alias para province
    city: string;
    country: string;
    zip: string;
    neighborhood?: string; // Para area_level3
    name?: string;
    phone?: string | null;
    email?: string | null;
    address1?: string | null;
  };
  parcels: Array<{
    weight: number; // en kg
    distance_unit: "CM";
    mass_unit: "KG";
    height: number; // en cm
    width: number; // en cm
    length: number; // en cm
  }>;
  order_id?: string; // Opcional, para el campo quotation.order_id
  declaredValue?: number; // Valor declarado del paquete
  cartValue?: number; // Valor del carrito (fallback para declared_value)
};

export type SkydropxQuotationRate = {
  id: string;
  provider_name?: string;
  provider_display_name?: string;
  provider_service_name?: string;
  days?: number;
  total?: number;
  currency_code?: string;
  pickup?: boolean;
  pickup_automatic?: boolean;
};

export type SkydropxQuotationResponse = {
  data?: SkydropxQuotationRate[];
  included?: SkydropxQuotationRate[];
  [key: string]: unknown;
};

export type SkydropxQuotationResult = 
  | { ok: true; data: SkydropxQuotationResponse }
  | { ok: false; code: "invalid_params" | "no_coverage" | "auth_error" | "network_error" | "unknown_error"; message: string; errors?: unknown };

/**
 * Crea una cotización de envío
 * 
 * Nota: El endpoint de cotizaciones de Skydropx (/api/v1/quotations) usa el formato
 * zip_from / zip_to + parcel, distinto al formato de Create Shipment (address_from/address_to/parcels).
 * Por eso transformamos el payload aquí.
 */
export async function createQuotation(
  payload: SkydropxQuotationPayload,
): Promise<SkydropxQuotationResult> {
  // Transformar el payload interno al formato esperado por Skydropx
  const firstParcel = payload.parcels[0];
  if (!firstParcel) {
    throw new Error("Se requiere al menos un paquete para la cotización");
  }

  // El endpoint de cotizaciones espera un objeto raíz "quotation" según la documentación oficial
  // URL: POST https://app.skydropx.com/api/v1/quotations
  const config = getSkydropxConfig();
  const fullUrl = config ? `${config.quotationsBaseUrl}/api/v1/quotations` : "unknown";
  
  // Construir el payload según la documentación oficial de Skydropx
  const quotationBody = {
    quotation: {
      order_id: payload.order_id || "ddn-web-checkout",
      address_from: {
        country_code: payload.address_from.country,
        postal_code: payload.address_from.zip,
        area_level1: payload.address_from.state 
          || payload.address_from.province 
          || "Ciudad de México",
        area_level2: payload.address_from.city || "",
        area_level3: payload.address_from.neighborhood 
          || payload.address_from.city 
          || "",
      },
      address_to: {
        country_code: payload.address_to.country,
        postal_code: payload.address_to.zip,
        area_level1: payload.address_to.state 
          || payload.address_to.province 
          || payload.address_from.state 
          || payload.address_from.province 
          || "Ciudad de México",
        area_level2: payload.address_to.city || "",
        area_level3: payload.address_to.neighborhood 
          || payload.address_to.city 
          || "",
      },
      parcels: [
        {
          length: Math.round(firstParcel.length),
          width: Math.round(firstParcel.width),
          height: Math.round(firstParcel.height),
          weight: Number(firstParcel.weight),
          package_protected: false,
          declared_value: payload.declaredValue 
            || (payload.cartValue ? Number(payload.cartValue) : 100),
        },
      ],
    },
  };
  
  if (process.env.NODE_ENV !== "production") {
    console.log("[Skydropx createQuotation] Enviando cotización:", {
      url: fullUrl,
      method: "POST",
      payload: quotationBody,
    });
  }
  
  // Usar fetch directo para cotizaciones ya que usa una URL base diferente (app.skydropx.com)
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      code: "auth_error",
      message: "No se pudo obtener token de acceso de Skydropx",
    };
  }

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(quotationBody),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    const errorText = await response.text();
    
    // Truncar HTML si es muy largo
    let errorBody: string | unknown = errorText;
    if (contentType?.includes("text/html")) {
      errorBody =
        typeof errorText === "string" && errorText.length > 500
          ? errorText.slice(0, 500) + "... (HTML truncado)"
          : errorText;
    } else if (contentType?.includes("application/json")) {
      try {
        errorBody = JSON.parse(errorText);
      } catch {
        errorBody = errorText;
      }
    }

    // config y fullUrl ya están definidos arriba, reutilizar
    const url = fullUrl;

    // Leer body.errors si existe para más contexto
    const errors = typeof errorBody === "object" && errorBody !== null && "errors" in errorBody
      ? errorBody.errors
      : undefined;
    
    // Construir mensaje de error más descriptivo
    const errorMessage = typeof errorBody === "object" && errorBody !== null && "message" in errorBody
      ? String(errorBody.message)
      : `Error ${response.status}: ${response.statusText}`;

    // Logs mejorados para errores 400 (Bad Request)
    if (response.status === 400) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Skydropx createQuotation] 400 Bad Request:", {
          url,
          status: response.status,
          statusText: response.statusText,
          contentType,
          body: errorBody,
          errors,
          payloadSent: quotationBody, // Log del payload que enviamos para debugging
        });
      }
      
      // Crear un resultado controlado para "parámetros inválidos" que puede indicar sin cobertura
      const isInvalidParams = errorMessage.toLowerCase().includes("parámetros") || 
                              errorMessage.toLowerCase().includes("invalid") ||
                              errorMessage.toLowerCase().includes("inválidos");
      
      if (isInvalidParams) {
        // Devolver resultado controlado en lugar de lanzar excepción
        return {
          ok: false,
          code: "invalid_params",
          message: errorMessage,
          errors,
        };
      }
      
      // Otros errores 400 también se tratan como sin cobertura
      return {
        ok: false,
        code: "no_coverage",
        message: errorMessage,
        errors,
      };
    }

    // Para errores de autenticación (401, 403)
    if (response.status === 401 || response.status === 403) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Skydropx createQuotation] Error de autenticación:", {
          url,
          status: response.status,
          statusText: response.statusText,
          contentType,
          body: errorBody,
        });
      }
      return {
        ok: false,
        code: "auth_error",
        message: errorMessage,
        errors,
      };
    }

    // Para otros errores (5xx, network, etc.)
    if (process.env.NODE_ENV !== "production") {
      console.error("[Skydropx createQuotation] Error:", {
        url,
        status: response.status,
        statusText: response.statusText,
        contentType,
        body: errorBody,
      });
    }
    
    // Para errores de red o 5xx, devolver resultado controlado pero con código diferente
    const isNetworkError = response.status >= 500 || response.status === 0;
    return {
      ok: false,
      code: isNetworkError ? "network_error" : "unknown_error",
      message: errorMessage,
      errors,
    };
  }

  // Respuesta exitosa
  const data = (await response.json()) as SkydropxQuotationResponse;
  
  if (process.env.NODE_ENV !== "production") {
    console.log("[Skydropx createQuotation] Respuesta OK, tarifas recibidas");
  }
  
  return { ok: true, data };
}

/**
 * Obtiene una cotización por ID
 */
export async function getQuotation(id: string): Promise<SkydropxQuotationResponse> {
  // Skydropx API usa /v1/quotations/{id} (no /api/v1/quotations/{id})
  const response = await skydropxFetch(`/v1/quotations/${id}`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (process.env.NODE_ENV !== "production") {
      console.error("[Skydropx getQuotation] Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
    }
    throw new Error(`Error al obtener cotización: ${response.statusText}`);
  }

  return (await response.json()) as SkydropxQuotationResponse;
}

/**
 * Tipos para envíos de Skydropx
 */
export type SkydropxShipmentPayload = {
  address_from: {
    province: string;
    city: string;
    country: string;
    zip: string;
    name?: string;
    phone?: string | null;
    email?: string | null;
    address1?: string | null;
  };
  address_to: {
    province: string;
    city: string;
    country: string;
    zip: string;
    name?: string;
    phone?: string | null;
    email?: string | null;
    address1?: string | null;
  };
  parcels: Array<{
    weight: number; // en kg
    distance_unit: "CM";
    mass_unit: "KG";
    height: number; // en cm
    width: number; // en cm
    length: number; // en cm
  }>;
  rate_id: string;
  products?: Array<{
    name: string;
    sku?: string;
    price?: number;
    quantity?: number;
  }>;
};

export type SkydropxShipmentPackage = {
  id?: string;
  tracking_number?: string;
  label_url?: string;
  [key: string]: unknown;
};

export type SkydropxShipmentResponse = {
  id?: string;
  carrier_name?: string;
  workflow_status?: string;
  payment_status?: string;
  total?: number;
  master_tracking_number?: string;
  relationships?: {
    packages?: {
      data?: Array<{ id: string; type: string }>;
    };
  };
  included?: SkydropxShipmentPackage[];
  data?: {
    id?: string;
    carrier_name?: string;
    workflow_status?: string;
    payment_status?: string;
    total?: number;
    master_tracking_number?: string;
    relationships?: {
      packages?: {
        data?: Array<{ id: string; type: string }>;
      };
    };
  };
  [key: string]: unknown;
};

/**
 * Crea un envío/guía en Skydropx
 * 
 * Hardening: Mejora diagnóstico de errores con status_code y snippet del body
 */
export async function createShipment(
  payload: SkydropxShipmentPayload,
): Promise<SkydropxShipmentResponse> {
  const config = getSkydropxConfig();
  if (!config) {
    throw new Error("Skydropx no está configurado");
  }

  // Skydropx API usa /v1/shipments (no /api/v1/shipments)
  // porque baseUrl ya es https://api.skydropx.com
  const fullUrl = `${config.restBaseUrl}/v1/shipments`;
  
  // Log seguro de URL (sin secretos)
  console.log("[Skydropx createShipment] Creando shipment:", {
    url: fullUrl,
    baseUrl: config.restBaseUrl,
    path: "/v1/shipments",
    rateId: payload.rate_id,
  });

  const response = await skydropxFetch("/v1/shipments", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    // Intentar parsear JSON del error (sin exponer PII ni tokens)
    let errorSnippet: string | null = null;
    try {
      const errorJson = JSON.parse(errorText) as Record<string, unknown>;
      // Extraer solo campos seguros para logging
      const safeFields: Record<string, unknown> = {};
      if (typeof errorJson.message === "string") {
        safeFields.message = errorJson.message;
      }
      if (typeof errorJson.error === "string") {
        safeFields.error = errorJson.error;
      }
      if (Array.isArray(errorJson.errors)) {
        safeFields.errors = errorJson.errors;
      }
      errorSnippet = JSON.stringify(safeFields);
    } catch {
      // Si no es JSON, usar primeros 200 caracteres
      errorSnippet = errorText.substring(0, 200);
    }

    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      url: fullUrl,
      baseUrl: config.restBaseUrl,
      errorSnippet,
    };

    console.error("[Skydropx createShipment] Error:", errorDetails);

    // Mapear 404 a código específico
    if (response.status === 404) {
      const error = new Error(`Error al crear envío: Rate no encontrado o expirado (404)`);
      (error as Error & { code?: string; statusCode?: number; details?: unknown }).code = "skydropx_not_found";
      (error as Error & { code?: string; statusCode?: number; details?: unknown }).statusCode = 404;
      (error as Error & { code?: string; statusCode?: number; details?: unknown }).details = errorDetails;
      throw error;
    }

    const error = new Error(`Error al crear envío: ${response.statusText || `HTTP ${response.status}`}`);
    (error as Error & { code?: string; statusCode?: number; details?: unknown }).statusCode = response.status;
    (error as Error & { code?: string; statusCode?: number; details?: unknown }).details = errorDetails;
    throw error;
  }

  return (await response.json()) as SkydropxShipmentResponse;
}

/**
 * Crea un envío en Skydropx a partir de un rate ID
 * Esta función simplifica la creación de envíos cuando ya se tiene un rate_id
 */
export async function createShipmentFromRate(input: {
  rateExternalId: string;
  addressFrom: {
    countryCode: string;
    postalCode: string;
    state: string;
    city: string;
    address1: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  addressTo: {
    countryCode: string;
    postalCode: string;
    state: string;
    city: string;
    address1: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  parcels: Array<{
    weight: number;
    height: number;
    width: number;
    length: number;
  }>;
}): Promise<{
  trackingNumber: string;
  labelUrl: string | null;
  rawId: string | null;
}> {
  const config = getSkydropxConfig();
  if (!config) {
    throw new Error("Skydropx no está configurado");
  }

  // Construir payload para crear shipment
  const shipmentPayload: SkydropxShipmentPayload = {
    rate_id: input.rateExternalId,
    address_from: {
      province: input.addressFrom.state,
      city: input.addressFrom.city,
      country: input.addressFrom.countryCode,
      zip: input.addressFrom.postalCode,
      name: input.addressFrom.name,
      phone: input.addressFrom.phone || null,
      email: input.addressFrom.email || null,
      address1: input.addressFrom.address1 || null,
    },
    address_to: {
      province: input.addressTo.state,
      city: input.addressTo.city,
      country: input.addressTo.countryCode,
      zip: input.addressTo.postalCode,
      name: input.addressTo.name,
      phone: input.addressTo.phone || null,
      email: input.addressTo.email || null,
      address1: input.addressTo.address1 || null,
    },
    parcels: input.parcels.map((p) => ({
      weight: p.weight,
      distance_unit: "CM",
      mass_unit: "KG",
      height: p.height,
      width: p.width,
      length: p.length,
    })),
  };

  if (process.env.NODE_ENV !== "production") {
    console.log("[Skydropx createShipmentFromRate] Creando envío:", {
      url: `${config.restBaseUrl}/v1/shipments`,
      method: "POST",
      rate_id: input.rateExternalId,
      from: `${input.addressFrom.city}, ${input.addressFrom.postalCode}`,
      to: `${input.addressTo.city}, ${input.addressTo.postalCode}`,
      parcels: input.parcels.length,
    });
  }

  // Llamar a createShipment
  const response = await createShipment(shipmentPayload);

  // Extraer tracking number y label URL
  const trackingNumber =
    response.master_tracking_number || response.data?.master_tracking_number || "";
  const rawId = response.id || response.data?.id || null;

  // Buscar label_url en los paquetes incluidos
  let labelUrl: string | null = null;
  if (response.included && Array.isArray(response.included)) {
    const firstPackage = response.included.find((pkg) => pkg.label_url);
    if (firstPackage?.label_url) {
      labelUrl = firstPackage.label_url;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[Skydropx createShipmentFromRate] Envío creado:", {
      trackingNumber,
      labelUrl: labelUrl ? "presente" : "no disponible",
      rawId,
    });
  }

  if (!trackingNumber) {
    throw new Error("No se recibió tracking number de Skydropx");
  }

  return {
    trackingNumber,
    labelUrl,
    rawId,
  };
}

