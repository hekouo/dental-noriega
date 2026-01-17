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
let configCache: SkydropxConfig | null = null;
const warnedKeys = new Set<string>();
const loggedKeys = new Set<string>();

const SKYDROPX_PRO_HOST = "https://pro.skydropx.com";
const SKYDROPX_API_PRO_HOST = "https://api-pro.skydropx.com";
const SKYDROPX_APP_HOST = "https://app.skydropx.com";

const ALLOWED_PRO_HOSTS = ["pro.skydropx.com"];
const ALLOWED_SHIPMENTS_HOSTS = ["api-pro.skydropx.com", "app.skydropx.com"];

type SkydropxConfig = {
  clientId: string;
  clientSecret: string;
  authBaseUrl: string;
  quotationsBaseUrl: string;
  restBaseUrl: string;
  oauthTokenUrl: string;
  sources: {
    authBaseUrl: string;
    quotationsBaseUrl: string;
    restBaseUrl: string;
    oauthTokenUrl: string;
  };
};

function stripTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeBaseUrl(value: string) {
  return stripTrailingSlashes(value.trim());
}

function parseAndValidateUrl(
  inputUrl: string,
  allowedHosts: string[],
): { ok: true; url: URL } | { ok: false; reason: string } {
  try {
    const url = new URL(inputUrl);
    if (url.protocol !== "https:") {
      return { ok: false, reason: "invalid_protocol" };
    }
    if (url.username || url.password) {
      return { ok: false, reason: "credentials_not_allowed" };
    }
    const host = url.hostname.toLowerCase();
    if (!allowedHosts.includes(host)) {
      return { ok: false, reason: "host_not_allowed" };
    }
    return { ok: true, url };
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
}

function assertAllowedSkydropxUrl(
  inputUrl: string,
  allowedHosts: string[],
  label: string,
) {
  const result = parseAndValidateUrl(inputUrl, allowedHosts);
  if (!result.ok) {
    const error = new Error(`Skydropx URL inválida para ${label}`);
    (error as Error & { code?: string }).code = "skydropx_invalid_host";
    throw error;
  }
  return result.url;
}

function normalizeAllowedBaseUrl(
  value: string | undefined,
  fallback: string,
  allowedHosts: string[],
) {
  if (!value) {
    const fallbackUrl = assertAllowedSkydropxUrl(fallback, allowedHosts, "fallback");
    return {
      url: fallbackUrl.origin,
      invalidProvided: null as string | null,
      ignoredPath: fallbackUrl.pathname && fallbackUrl.pathname !== "/" ? fallbackUrl.pathname : null,
    };
  }
  const normalized = normalizeBaseUrl(value);
  const validation = parseAndValidateUrl(normalized, allowedHosts);
  if (!validation.ok) {
    const fallbackUrl = assertAllowedSkydropxUrl(fallback, allowedHosts, "fallback");
    return {
      url: fallbackUrl.origin,
      invalidProvided: normalized,
      ignoredPath: fallbackUrl.pathname && fallbackUrl.pathname !== "/" ? fallbackUrl.pathname : null,
    };
  }
  return {
    url: validation.url.origin,
    invalidProvided: null as string | null,
    ignoredPath: validation.url.pathname && validation.url.pathname !== "/" ? validation.url.pathname : null,
  };
}

function normalizeShipmentsBaseUrl(value: string | undefined, fallback: string) {
  const normalized = normalizeBaseUrl(value || fallback);
  const validation = parseAndValidateUrl(normalized, ALLOWED_SHIPMENTS_HOSTS);
  if (!validation.ok) {
    const fallbackUrl = assertAllowedSkydropxUrl(fallback, ALLOWED_SHIPMENTS_HOSTS, "shipments");
    return fallbackUrl.origin;
  }
  return validation.url.origin;
}

function warnOnce(key: string, message: string, payload?: Record<string, unknown>) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message, payload);
}

function logOnce(key: string, message: string, payload?: Record<string, unknown>) {
  if (loggedKeys.has(key)) return;
  loggedKeys.add(key);
  console.log(message, payload);
}

export function getSkydropxApiHosts() {
  const config = getSkydropxConfig();
  if (!config) {
    return null;
  }
  const fallbackQuotationsBaseUrl =
    config.quotationsBaseUrl === SKYDROPX_PRO_HOST
      ? SKYDROPX_API_PRO_HOST
      : SKYDROPX_PRO_HOST;
  return {
    quotationsBaseUrl: config.quotationsBaseUrl,
    authBaseUrl: config.authBaseUrl,
    restBaseUrl: config.restBaseUrl,
    oauthTokenUrl: config.oauthTokenUrl,
    sources: config.sources,
    fallbackQuotationsBaseUrl,
  };
}

/**
 * Obtiene la configuración de Skydropx desde env vars
 * Usa OAuth exclusivamente
 */
export function getSkydropxConfig() {
  if (configCache) {
    return configCache;
  }

  const clientId = process.env.SKYDROPX_CLIENT_ID;
  const clientSecret = process.env.SKYDROPX_CLIENT_SECRET;
  
  const authBaseUrlRaw = process.env.SKYDROPX_AUTH_BASE_URL?.trim();
  const quotationsBaseUrlRaw = process.env.SKYDROPX_QUOTATIONS_BASE_URL?.trim();
  const legacyBaseUrlRaw =
    (!authBaseUrlRaw && !quotationsBaseUrlRaw && process.env.SKYDROPX_BASE_URL?.trim())
      ? process.env.SKYDROPX_BASE_URL?.trim()
      : undefined;
  const legacyApiBaseUrlRaw =
    (!authBaseUrlRaw && !quotationsBaseUrlRaw && !legacyBaseUrlRaw && process.env.SKYDROPX_API_BASE_URL?.trim())
      ? process.env.SKYDROPX_API_BASE_URL?.trim()
      : undefined;

  const authBaseUrlResolved = normalizeAllowedBaseUrl(
    authBaseUrlRaw || legacyBaseUrlRaw || legacyApiBaseUrlRaw,
    SKYDROPX_PRO_HOST,
    ALLOWED_PRO_HOSTS,
  );
  const quotationsBaseUrlResolved = normalizeAllowedBaseUrl(
    quotationsBaseUrlRaw || legacyBaseUrlRaw || legacyApiBaseUrlRaw,
    SKYDROPX_PRO_HOST,
    ALLOWED_PRO_HOSTS,
  );

  if (authBaseUrlResolved.invalidProvided) {
    warnOnce("skydropx-auth-invalid-host", "[Skydropx Config] auth host inválido, usando fallback", {
      provided_host: authBaseUrlResolved.invalidProvided,
      fallback_host: SKYDROPX_PRO_HOST,
    });
  }
  if (authBaseUrlResolved.ignoredPath) {
    warnOnce("skydropx-auth-path-ignored", "[Skydropx Config] auth baseUrl con path ignorado", {
      ignored_path: authBaseUrlResolved.ignoredPath,
    });
  }
  if (quotationsBaseUrlResolved.invalidProvided) {
    warnOnce("skydropx-quotations-invalid-host", "[Skydropx Config] quotations host inválido, usando fallback", {
      provided_host: quotationsBaseUrlResolved.invalidProvided,
      fallback_host: SKYDROPX_PRO_HOST,
    });
  }
  if (quotationsBaseUrlResolved.ignoredPath) {
    warnOnce("skydropx-quotations-path-ignored", "[Skydropx Config] quotations baseUrl con path ignorado", {
      ignored_path: quotationsBaseUrlResolved.ignoredPath,
    });
  }

  const authBaseUrlSource = authBaseUrlRaw
    ? "SKYDROPX_AUTH_BASE_URL"
    : legacyBaseUrlRaw
      ? "legacy SKYDROPX_BASE_URL"
      : legacyApiBaseUrlRaw
        ? "legacy SKYDROPX_API_BASE_URL"
        : "default";
  const quotationsBaseUrlSource = quotationsBaseUrlRaw
    ? "SKYDROPX_QUOTATIONS_BASE_URL"
    : legacyBaseUrlRaw
      ? "legacy SKYDROPX_BASE_URL"
      : legacyApiBaseUrlRaw
        ? "legacy SKYDROPX_API_BASE_URL"
        : "default";

  // URL base para otros endpoints de API (shipments, etc.)
  const restBaseUrlRaw =
    process.env.SKYDROPX_SHIPMENTS_BASE_URL?.trim() ||
    process.env.SKYDROPX_BASE_URL?.trim() ||
    process.env.SKYDROPX_API_BASE_URL?.trim();
  const restBaseUrl = normalizeShipmentsBaseUrl(restBaseUrlRaw, SKYDROPX_API_PRO_HOST);
  const restBaseUrlSource = process.env.SKYDROPX_SHIPMENTS_BASE_URL?.trim()
    ? "SKYDROPX_SHIPMENTS_BASE_URL"
    : process.env.SKYDROPX_BASE_URL?.trim()
      ? "legacy SKYDROPX_BASE_URL"
      : process.env.SKYDROPX_API_BASE_URL?.trim()
        ? "legacy SKYDROPX_API_BASE_URL"
        : "default";

  const oauthTokenUrlRaw = process.env.SKYDROPX_OAUTH_TOKEN_URL?.trim();
  const oauthTokenFallbackUrl = new URL("api/v1/oauth/token", `${authBaseUrlResolved.url}/`);
  const oauthTokenUrlResolved = normalizeAllowedBaseUrl(
    oauthTokenUrlRaw,
    oauthTokenFallbackUrl.toString(),
    ALLOWED_PRO_HOSTS,
  );
  if (oauthTokenUrlResolved.invalidProvided) {
    warnOnce("skydropx-oauth-invalid-host", "[Skydropx Config] oauth token host inválido, usando authBaseUrl", {
      provided_host: oauthTokenUrlResolved.invalidProvided,
      fallback_host: authBaseUrlResolved.url,
    });
  }
  if (oauthTokenUrlResolved.ignoredPath) {
    warnOnce("skydropx-oauth-path-ignored", "[Skydropx Config] oauth token url con path ignorado", {
      ignored_path: oauthTokenUrlResolved.ignoredPath,
    });
  }
  const oauthTokenUrlSource = oauthTokenUrlRaw ? "SKYDROPX_OAUTH_TOKEN_URL" : "derived";

  logOnce("skydropx-config", "[Skydropx Config] resolved base URLs:", {
    auth: {
      host: authBaseUrlResolved.url,
      source: authBaseUrlSource,
    },
    quotations: {
      host: quotationsBaseUrlResolved.url,
      source: quotationsBaseUrlSource,
    },
    oauth: {
      url: oauthTokenUrlResolved.url,
      source: oauthTokenUrlSource,
    },
    shipments: {
      host: restBaseUrl,
      source: restBaseUrlSource,
    },
  });

  if (!clientId || !clientSecret) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        "Skydropx config missing: requiere SKYDROPX_CLIENT_ID y SKYDROPX_CLIENT_SECRET",
      );
    }
    return null;
  }

  configCache = {
    clientId,
    clientSecret,
    authBaseUrl: authBaseUrlResolved.url,
    quotationsBaseUrl: quotationsBaseUrlResolved.url,
    restBaseUrl,
    oauthTokenUrl: oauthTokenUrlResolved.url,
    sources: {
      authBaseUrl: authBaseUrlSource,
      quotationsBaseUrl: quotationsBaseUrlSource,
      restBaseUrl: restBaseUrlSource,
      oauthTokenUrl: oauthTokenUrlSource,
    },
  };
  return configCache;
}

/**
 * Obtiene un token de acceso OAuth desde Skydropx
 * Usa grant_type=client_credentials
 * 
 * Hardening: Intenta múltiples URLs si falla con 404:
 * 1. Si existe SKYDROPX_OAUTH_TOKEN_URL, úsalo tal cual
 * 2. Si no existe, intenta en orden:
 *    a) ${SKYDROPX_AUTH_BASE_URL}/api/v1/oauth/token
 *    b) ${SKYDROPX_AUTH_BASE_URL}/oauth/token
 * 3. Si el primer intento da 404, prueba el segundo automáticamente
 */
async function fetchAccessToken(): Promise<string | null> {
  const config = getSkydropxConfig();
  if (!config) {
    return null;
  }

  const tokenUrls: string[] = [];
  const oauthUrl = assertAllowedSkydropxUrl(config.oauthTokenUrl, ALLOWED_PRO_HOSTS, "oauth");
  tokenUrls.push(oauthUrl.toString());
  const authBaseUrl = assertAllowedSkydropxUrl(config.authBaseUrl, ALLOWED_PRO_HOSTS, "auth");
  if (oauthUrl.toString() === `${authBaseUrl.origin}/api/v1/oauth/token`) {
    tokenUrls.push(new URL("oauth/token", `${authBaseUrl.origin}/`).toString());
  }

  // Usar application/x-www-form-urlencoded como especifica OAuth 2.0
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  let lastError: Error | null = null;
  
  for (let i = 0; i < tokenUrls.length; i++) {
    const tokenUrl = tokenUrls[i];
    
    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("[Skydropx OAuth] Intentando obtener token desde:", tokenUrl);
      }
      
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
        
        // Logs seguros (sin secretos)
        if (process.env.NODE_ENV !== "production") {
          console.error("[Skydropx OAuth] Error obteniendo token:", {
            url: tokenUrl,
            status: response.status,
            statusText: response.statusText,
            contentType,
            body: errorBody,
          });
        }
        
        // Si es 404 y hay más URLs para intentar, continuar
        if (response.status === 404 && i < tokenUrls.length - 1) {
          console.warn(`[Skydropx OAuth] 404 en ${tokenUrl}, intentando siguiente URL...`);
          continue;
        }
        
        // Si es 401/400, devolver error claro (sin filtrar secretos en mensaje, pero sin exponerlos en logs)
        if (response.status === 401 || response.status === 403) {
          const error = new Error("Credenciales de Skydropx inválidas. Verifica SKYDROPX_CLIENT_ID y SKYDROPX_CLIENT_SECRET");
          (error as Error & { code?: string; statusCode?: number }).code = "skydropx_oauth_failed";
          (error as Error & { code?: string; statusCode?: number }).statusCode = response.status;
          throw error;
        }
        
        if (response.status === 400) {
          const error = new Error(`Error de autenticación OAuth: ${response.statusText}`);
          (error as Error & { code?: string; statusCode?: number }).code = "skydropx_oauth_failed";
          (error as Error & { code?: string; statusCode?: number }).statusCode = response.status;
          throw error;
        }
        
        // Para otros errores, si es el último intento, devolver null
        if (i === tokenUrls.length - 1) {
          return null;
        }
        continue;
      }

      // Verificar que la respuesta sea JSON antes de parsear
      const responseContentType = response.headers.get("content-type");
      if (!responseContentType?.includes("application/json")) {
        const text = await response.text();
        if (process.env.NODE_ENV !== "production") {
          console.error("[Skydropx OAuth] Respuesta no es JSON:", {
            url: tokenUrl,
            contentType: responseContentType,
            body: text.slice(0, 500),
          });
        }
        // Si es el último intento, devolver null; si no, continuar
        if (i === tokenUrls.length - 1) {
          return null;
        }
        continue;
      }

      const data = (await response.json()) as OAuthTokenResponse;

      if (!data.access_token) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[Skydropx OAuth] Respuesta sin access_token:", {
            url: tokenUrl,
            data: Object.keys(data),
          });
        }
        // Si es el último intento, devolver null; si no, continuar
        if (i === tokenUrls.length - 1) {
          return null;
        }
        continue;
      }

      // Éxito: calcular fecha de expiración (con margen de 60 segundos para evitar race conditions)
      const expiresIn = data.expires_in || 3600; // default 1 hora
      const expiresAt = Date.now() + (expiresIn - 60) * 1000;

      // Actualizar caché
      tokenCache = {
        accessToken: data.access_token,
        expiresAt,
      };

      console.log("[Skydropx OAuth] Token obtenido exitosamente desde:", tokenUrl, "expira en", expiresIn, "segundos");

      return data.access_token;
    } catch (error) {
      // Si es un error lanzado explícitamente (401/400), propagarlo
      if (error instanceof Error && (error as Error & { code?: string }).code === "skydropx_oauth_failed") {
        throw error;
      }
      
      // Para otros errores, guardar y continuar si hay más URLs
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.warn(`[Skydropx OAuth] Error en ${tokenUrl}:`, {
        error: lastError.message,
        ...(i < tokenUrls.length - 1 && { action: "intentando siguiente URL..." }),
      });
      
      if (i < tokenUrls.length - 1) {
        continue;
      }
      
      // Si es el último intento y el error ya tiene mensaje descriptivo, propagarlo
      if (error instanceof Error && error.message.includes("Credenciales")) {
        throw error;
      }
      return null;
    }
  }

  return null;
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
 */
export async function skydropxFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const config = getSkydropxConfig();
  if (!config) {
    throw new Error("Skydropx no está configurado");
  }

  if (/^https?:\/\//i.test(path)) {
    const error = new Error("Skydropx path inválido (debe ser relativo)");
    (error as Error & { code?: string }).code = "skydropx_invalid_host";
    throw error;
  }

  const baseUrl = assertAllowedSkydropxUrl(config.restBaseUrl, ALLOWED_SHIPMENTS_HOSTS, "shipments");
  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${baseUrl.origin}/`).toString();

  // Log seguro de URL (sin secretos)
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[Skydropx] Request:",
      {
        method: options.method ?? "GET",
        path,
        baseHost: baseUrl.host,
        fullPath: new URL(url).pathname,
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
    area_level1?: string;
    area_level2?: string;
    area_level3?: string;
    name?: string;
    phone?: string | null;
    email?: string | null;
    address1?: string | null;
    address2?: string; // Opcional: segunda línea o referencia
  };
  address_to: {
    province?: string;
    state?: string; // Alias para province
    city: string;
    country: string;
    zip: string;
    neighborhood?: string; // Para area_level3
    area_level1?: string;
    area_level2?: string;
    area_level3?: string;
    name?: string;
    phone?: string | null;
    email?: string | null;
    address1?: string | null;
    address2?: string; // Opcional: segunda línea o referencia
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
  reference?: string; // Referencia externa del cliente (si aplica)
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
  id?: string; // quotation_id devuelto por POST
  is_completed?: boolean; // true cuando la cotización está completa
  data?: SkydropxQuotationRate[];
  included?: SkydropxQuotationRate[];
  quotation?: {
    id?: string;
    is_completed?: boolean;
    rates?: SkydropxQuotationRate[];
  };
  [key: string]: unknown;
};

export type SkydropxQuotationResult = 
  | { ok: true; data: SkydropxQuotationResponse; quotationId?: string; isCompleted?: boolean; pollingInfo?: { attempts: number; elapsedMs: number } }
  | { ok: false; code: "invalid_params" | "no_coverage" | "auth_error" | "network_error" | "unknown_error" | "quotation_pending"; message: string; errors?: unknown; quotationId?: string; isCompleted?: boolean; pollingInfo?: { attempts: number; elapsedMs: number } };

type CreateQuotationOptions = {
  baseUrlOverride?: string;
  logLabel?: "primary" | "fallback";
};

/**
 * Crea una cotización de envío
 * 
 * Nota: El endpoint de cotizaciones de Skydropx (/api/v1/quotations) usa el formato
 * zip_from / zip_to + parcel, distinto al formato de Create Shipment (address_from/address_to/parcels).
 * Por eso transformamos el payload aquí.
 */
export async function createQuotation(
  payload: SkydropxQuotationPayload,
  options?: CreateQuotationOptions,
): Promise<SkydropxQuotationResult> {
  // Transformar el payload interno al formato esperado por Skydropx
  const firstParcel = payload.parcels[0];
  if (!firstParcel) {
    throw new Error("Se requiere al menos un paquete para la cotización");
  }

  // El endpoint de cotizaciones espera un objeto raíz "quotation" según la documentación oficial
  // URL: POST https://app.skydropx.com/api/v1/quotations
  const config = getSkydropxConfig();
  const baseUrl = normalizeBaseUrl(options?.baseUrlOverride || config?.quotationsBaseUrl || SKYDROPX_PRO_HOST);
  const validatedBaseUrl = assertAllowedSkydropxUrl(baseUrl, ALLOWED_PRO_HOSTS, "quotations");
  const fullUrl = new URL("api/v1/quotations", `${validatedBaseUrl.origin}/`).toString();
  
  const normalizeState = (value?: string | null) => {
    if (!value) return "";
    const normalized = value.toLowerCase().trim();
    if (normalized === "cdmx" || normalized === "ciudad de mexico" || normalized === "ciudad de méxico") {
      return "CDMX";
    }
    if (normalized === "edomex" || normalized === "estado de mexico" || normalized === "estado de méxico") {
      return "MEX";
    }
    return value.trim();
  };

  const normalizeCity = (value?: string | null) => {
    if (!value) return "";
    const normalized = value.toLowerCase().trim();
    if (normalized === "cdmx" || normalized === "ciudad de mexico" || normalized === "ciudad de méxico") {
      return "Ciudad de México";
    }
    return value.trim();
  };

  const fromState =
    payload.address_from.area_level1?.trim() ||
    normalizeState(payload.address_from.state || payload.address_from.province) ||
    "CDMX";
  const toState =
    payload.address_to.area_level1?.trim() ||
    normalizeState(payload.address_to.state || payload.address_to.province) ||
    normalizeState(payload.address_from.state || payload.address_from.province) ||
    "CDMX";
  const fromCity =
    payload.address_from.area_level2?.trim() ||
    normalizeCity(payload.address_from.city) ||
    "";
  const toCity =
    payload.address_to.area_level2?.trim() ||
    normalizeCity(payload.address_to.city) ||
    "";

  // Construir el payload según la documentación oficial de Skydropx
  const trimmedOrderId = payload.order_id?.trim() || "";
  const trimmedReference = payload.reference?.trim() || "";
  const quotationBody = {
    quotation: {
      ...(trimmedOrderId ? { order_id: trimmedOrderId } : {}),
      ...(trimmedReference ? { reference: trimmedReference } : {}),
      address_from: {
        country_code: payload.address_from.country,
        postal_code: payload.address_from.zip,
        area_level1: fromState,
        area_level2: fromCity,
        // area_level3 = colonia/barrio (NO calle)
        // PRIORIDAD: address2 (colonia) > neighborhood > address1 (último recurso)
        area_level3:
          payload.address_from.area_level3?.trim() ||
          payload.address_from.address2 ||
          payload.address_from.neighborhood ||
          payload.address_from.address1 ||
          payload.address_from.city ||
          "",
      },
      address_to: {
        country_code: payload.address_to.country,
        postal_code: payload.address_to.zip,
        area_level1: toState,
        area_level2: toCity,
        // area_level3 = colonia/barrio (NO calle)
        // PRIORIDAD: address2 (colonia) > neighborhood > address1 (último recurso)
        area_level3:
          payload.address_to.area_level3?.trim() ||
          payload.address_to.address2 ||
          payload.address_to.neighborhood ||
          payload.address_to.address1 ||
          payload.address_to.city ||
          "",
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
  
  const safePayload = {
    quotationKeys: Object.keys(quotationBody.quotation),
    reference: trimmedReference || null,
    hasOrderId: Boolean(trimmedOrderId),
    baseUrl: validatedBaseUrl.origin,
    host_role: options?.logLabel || "primary",
    origin: {
      country_code: payload.address_from.country,
      postal_code: payload.address_from.zip,
      state: fromState,
      city: fromCity,
    },
    destination: {
      country_code: payload.address_to.country,
      postal_code: payload.address_to.zip,
      state: toState,
      city: toCity,
    },
    parcel: {
      length: Math.round(firstParcel.length),
      width: Math.round(firstParcel.width),
      height: Math.round(firstParcel.height),
      weight: Number(firstParcel.weight),
    },
    declared_value: quotationBody.quotation.parcels?.[0]?.declared_value ?? null,
  };

  if (process.env.NODE_ENV !== "production") {
    console.log("[Skydropx createQuotation] Enviando cotización:", {
      host: validatedBaseUrl.host,
      path: new URL(fullUrl).pathname,
      method: "POST",
      payload: safePayload,
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
          payloadSent: safePayload, // Log sin PII
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

  // Respuesta exitosa del POST
  const postData = (await response.json()) as SkydropxQuotationResponse;
  
  // Extraer quotation_id de la respuesta
  const quotationId = postData.id || postData.quotation?.id || (postData as any).quotation_id;
  const isCompleted = postData.is_completed ?? postData.quotation?.is_completed ?? false;
  
  if (process.env.NODE_ENV !== "production") {
    console.log("[Skydropx createQuotation] POST OK", {
      quotationId,
      isCompleted,
      hasRates: !!(postData.data?.length || postData.included?.length || postData.quotation?.rates?.length),
    });
  }
  
  // Si ya está completa, devolver directamente
  if (isCompleted && quotationId) {
    return { 
      ok: true, 
      data: postData,
      quotationId,
      isCompleted: true,
      pollingInfo: { attempts: 0, elapsedMs: 0 },
    };
  }
  
  // Si no hay quotation_id, no podemos hacer polling
  if (!quotationId) {
    // Intentar usar la respuesta como está (compatibilidad con formato antiguo)
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Skydropx createQuotation] No quotation_id en respuesta, devolviendo respuesta directa");
    }
    return { 
      ok: true, 
      data: postData,
      isCompleted: isCompleted,
      pollingInfo: { attempts: 0, elapsedMs: 0 },
    };
  }
  
  // Implementar polling: GET /api/v1/quotations/{id} hasta is_completed=true
  const maxAttempts = 12; // ~6-8 segundos con 500ms entre intentos
  const pollIntervalMs = 500; // Respetar rate limit (min 500ms)
  const timeoutMs = 8000; // Timeout total de 8 segundos
  
  const startTime = Date.now();
  let attempts = 0;
  let lastResponse = postData;
  
  // Definir quotationsBaseUrl para usar en polling (misma que en POST)
  const quotationsBaseUrlForPolling = validatedBaseUrl.origin;
  
  while (attempts < maxAttempts) {
    attempts++;
    const elapsedMs = Date.now() - startTime;
    
    // Verificar timeout
    if (elapsedMs >= timeoutMs) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Skydropx createQuotation] Timeout en polling", {
          quotationId,
          attempts,
          elapsedMs,
          isCompleted: lastResponse.is_completed ?? lastResponse.quotation?.is_completed,
        });
      }
      return {
        ok: false,
        code: "quotation_pending",
        message: "La cotización está en progreso. Por favor, reintenta en unos momentos.",
        quotationId,
        isCompleted: false,
        pollingInfo: { attempts, elapsedMs },
      };
    }
    
    // Esperar antes del siguiente intento (excepto el primero)
    if (attempts > 1) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    
    try {
      // GET /api/v1/quotations/{id}
      const getUrl = new URL(
        `api/v1/quotations/${quotationId}`,
        `${quotationsBaseUrlForPolling}/`,
      ).toString();
      const getResponse = await fetch(getUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      
      if (!getResponse.ok) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[Skydropx createQuotation] GET error en intento ${attempts}:`, {
            status: getResponse.status,
            statusText: getResponse.statusText,
          });
        }
        // Continuar polling si es un error temporal (5xx)
        if (getResponse.status >= 500) {
          continue;
        }
        // Para otros errores, devolver error
        return {
          ok: false,
          code: "network_error",
          message: `Error al obtener cotización: ${getResponse.statusText}`,
          quotationId,
          isCompleted: false,
          pollingInfo: { attempts, elapsedMs },
        };
      }
      
      lastResponse = (await getResponse.json()) as SkydropxQuotationResponse;
      const currentIsCompleted = lastResponse.is_completed ?? lastResponse.quotation?.is_completed ?? false;
      
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Skydropx createQuotation] Polling intento ${attempts}`, {
          quotationId,
          isCompleted: currentIsCompleted,
          hasRates: !!(lastResponse.data?.length || lastResponse.included?.length || lastResponse.quotation?.rates?.length),
          elapsedMs,
        });
      }
      
      // Si está completa, devolver resultado
      if (currentIsCompleted) {
        return {
          ok: true,
          data: lastResponse,
          quotationId,
          isCompleted: true,
          pollingInfo: { attempts, elapsedMs },
        };
      }
      
      // Continuar polling
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Skydropx createQuotation] Error en polling intento ${attempts}:`, error);
      }
      // Continuar polling si es un error de red temporal
      if (error instanceof Error && (error.message.includes("fetch") || error.message.includes("network"))) {
        continue;
      }
      // Para otros errores, devolver error
      return {
        ok: false,
        code: "network_error",
        message: `Error en polling: ${error instanceof Error ? error.message : "unknown"}`,
        quotationId,
        isCompleted: false,
        pollingInfo: { attempts, elapsedMs: Date.now() - startTime },
      };
    }
  }
  
  // Si llegamos aquí, se agotaron los intentos sin completar
  if (process.env.NODE_ENV !== "production") {
    console.warn("[Skydropx createQuotation] Polling agotado sin completar", {
      quotationId,
      attempts,
      elapsedMs: Date.now() - startTime,
      isCompleted: lastResponse.is_completed ?? lastResponse.quotation?.is_completed,
    });
  }
  
  return {
    ok: false,
    code: "quotation_pending",
    message: "La cotización está en progreso. Por favor, reintenta en unos momentos.",
    quotationId,
    isCompleted: false,
    pollingInfo: { attempts, elapsedMs: Date.now() - startTime },
  };
}

/**
 * Obtiene una cotización por ID
 */
export async function getQuotation(
  id: string,
  options?: { baseUrlOverride?: string },
): Promise<SkydropxQuotationResponse> {
  // Skydropx API usa /api/v1/quotations/{id} según docs
  const quotationsBaseUrl = normalizeBaseUrl(
    options?.baseUrlOverride ||
      process.env.SKYDROPX_QUOTATIONS_BASE_URL ||
      process.env.SKYDROPX_API_BASE_URL ||
      SKYDROPX_PRO_HOST,
  );
  const validatedBaseUrl = assertAllowedSkydropxUrl(
    quotationsBaseUrl,
    ALLOWED_PRO_HOSTS,
    "quotations",
  );
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso de Skydropx");
  }
  
  const response = await fetch(
    new URL(`api/v1/quotations/${id}`, `${validatedBaseUrl.origin}/`).toString(),
    {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    },
  );

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

export function extractQuotationRates(
  quotation: SkydropxQuotationResponse | null | undefined,
): SkydropxQuotationRate[] {
  if (!quotation) return [];
  const data = quotation.data;
  const included = quotation.included;
  const nestedRates = quotation.quotation?.rates;
  if (Array.isArray(data) && data.length > 0) return data;
  if (Array.isArray(included) && included.length > 0) return included;
  if (Array.isArray(nestedRates) && nestedRates.length > 0) return nestedRates;
  return [];
}

export async function waitForQuotationRates(
  quotationId: string,
  options?: { maxAttempts?: number; delayMs?: number; baseUrlOverride?: string },
): Promise<{
  quotation: SkydropxQuotationResponse | null;
  rates: SkydropxQuotationRate[];
  isCompleted: boolean;
  attempts: number;
  lastError: string | null;
}> {
  const maxAttempts = options?.maxAttempts ?? 8;
  const delayMs = options?.delayMs ?? 700;
  let attempts = 0;
  let lastError: string | null = null;
  let lastQuotation: SkydropxQuotationResponse | null = null;
  let lastRates: SkydropxQuotationRate[] = [];
  let lastIsCompleted = false;

  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      const quotation = await getQuotation(quotationId, {
        baseUrlOverride: options?.baseUrlOverride,
      });
      const rates = extractQuotationRates(quotation);
      const isCompleted = Boolean(
        quotation.is_completed ?? quotation.quotation?.is_completed ?? false,
      );
      lastQuotation = quotation;
      lastRates = rates;
      lastIsCompleted = isCompleted;

      if (rates.length > 0) {
        return {
          quotation,
          rates,
          isCompleted,
          attempts,
          lastError,
        };
      }

      if (isCompleted && rates.length === 0) {
        break;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown_error";
    }

    if (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    quotation: lastQuotation,
    rates: lastRates,
    isCompleted: lastIsCompleted,
    attempts,
    lastError,
  };
}

/**
 * Tipos para envíos de Skydropx
 */
export type SkydropxShipmentPayload = {
  shipment: {
    rate_id: string;
    address_from: {
      // Campos comunes
      country: string; // "MX"
      country_code?: string; // "MX" (alias opcional)
      zip: string;
      postal_code?: string; // alias opcional de zip
      city: string;
      state: string; // requerido
      province?: string; // alias de state
      // Requeridos por PRO (mínimos recomendados)
      street1: string;
      name: string;
      company: string;
      phone: string | null;
      email: string | null;
      reference: string;
      // Alias legacy (por compatibilidad; no debería romper si el upstream ignora)
      address1?: string;
    };
    address_to: {
      country: string; // "MX"
      country_code?: string; // "MX" (alias opcional)
      zip: string;
      postal_code?: string; // alias opcional de zip
      city: string;
      state: string; // requerido
      province?: string; // alias de state
      street1: string;
      name: string;
      company: string;
      phone: string | null;
      email: string | null;
      reference: string;
      address1?: string;
    };
    // PRO shipments usa packages (no parcels)
    packages: Array<{
      package_number: string; // REQUIRED: "1", "2", etc.
      package_protected: boolean; // REQUIRED
      weight: number; // kg
      height: number; // cm
      width: number; // cm
      length: number; // cm
      declared_value?: number; // opcional
      consignment_note: string; // REQUIRED para PRO: código Carta Porte (SAT)
      package_type: string; // REQUIRED para PRO: código tipo empaque (SAT)
    }>;
    declared_value?: number;
    printing_format?: "standard" | "thermal";
    products?: Array<{
      name: string;
      sku?: string;
      price?: number;
      quantity?: number;
    }>;
  };
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

function sanitizeMxPhoneDigits(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  // Quitar prefijo MX +52 si viene pegado: 521234567890 o 52XXXXXXXXXX
  const withoutCountry =
    digits.length === 12 && digits.startsWith("52") ? digits.slice(2) : digits;
  // Si viene más largo, quedarnos con los últimos 10 (común en MX)
  if (withoutCountry.length > 10) return withoutCountry.slice(-10);
  return withoutCountry;
}

/**
 * Normaliza errores de Skydropx desde múltiples formatos a un array uniforme
 */
function normalizeSkydropxErrors(errors: unknown, maxDepth = 2, currentDepth = 0): Array<{ field: string | null; message: string; code?: string; path?: string }> {
  const result: Array<{ field: string | null; message: string; code?: string; path?: string }> = [];
  
  if (currentDepth > maxDepth || !errors) return result;

  // Caso 1: Array de objetos
  if (Array.isArray(errors)) {
    for (const item of errors.slice(0, 10)) {
      if (typeof item === "string") {
        // Array<string> -> [{field:null, message:str}]
        result.push({ field: null, message: item });
      } else if (item && typeof item === "object") {
        // Array<object> -> normalizar
        const er = item as Record<string, unknown>;
        result.push({
          field: typeof er.field === "string" ? er.field : typeof er.path === "string" ? er.path : typeof er.attribute === "string" ? er.attribute : null,
          message: typeof er.message === "string" ? er.message : typeof er.detail === "string" ? er.detail : typeof er.code === "string" ? er.code : "unknown",
          code: typeof er.code === "string" ? er.code : undefined,
          path: typeof er.path === "string" ? er.path : undefined,
        });
      }
    }
    return result;
  }

  // Caso 2: Object/dictionary (ej: { field: ["msg1","msg2"] } o { field: "msg" })
  if (typeof errors === "object") {
    const obj = errors as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        // Si v es array<string> -> push {field:k, message:s}
        for (const item of value) {
          if (typeof item === "string") {
            result.push({ field: key, message: item });
          } else if (item && typeof item === "object" && currentDepth < maxDepth) {
            // Si v es array<object> -> normalizar recursivamente
            const nested = normalizeSkydropxErrors(item, maxDepth, currentDepth + 1);
            result.push(...nested.map((e) => ({ ...e, field: e.field || key })));
          }
        }
      } else if (typeof value === "string") {
        // Si v es string -> push {field:k, message:v}
        result.push({ field: key, message: value });
      } else if (value && typeof value === "object" && currentDepth < maxDepth) {
        // Si v es object -> flatten recursivo
        const nested = normalizeSkydropxErrors(value, maxDepth, currentDepth + 1);
        result.push(...nested.map((e) => ({ ...e, field: e.field || key })));
      }
    }
    return result;
  }

  // Caso 3: string directo
  if (typeof errors === "string") {
    return [{ field: null, message: errors }];
  }

  return result;
}

function sanitizeSkydropxErrorBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;

  const safe: Record<string, unknown> = {
    keys: Object.keys(obj).slice(0, 50),
  };

  if (typeof obj.message === "string") safe.message = obj.message;
  if (typeof obj.error === "string") safe.error = obj.error;

  // Extraer errors desde múltiples formatos posibles
  const maybeErrors = obj.errors;
  if (maybeErrors !== undefined && maybeErrors !== null) {
    const normalizedErrors = normalizeSkydropxErrors(maybeErrors).slice(0, 10);
    if (normalizedErrors.length > 0) {
      safe.errors = normalizedErrors;
    }
  }

  return safe;
}

/**
 * Crea un envío/guía en Skydropx
 * 
 * Hardening: Fallback solo de PATH (no de host):
 * - Intenta primero: /api/v1/shipments
 * - Si 404, intenta: /v1/shipments
 * - NO cambia el host (debe ser api-pro.skydropx.com para OAuth)
 */
export async function createShipment(
  payload: SkydropxShipmentPayload,
): Promise<SkydropxShipmentResponse> {
  const config = getSkydropxConfig();
  if (!config) {
    throw new Error("Skydropx no está configurado");
  }

  // Intentar primero con /api/v1/shipments, luego /v1/shipments (solo path, no host)
  const pathsToTry = ["/api/v1/shipments", "/v1/shipments"];
  let lastError: Error | null = null;
  let lastResponse: Response | null = null;
  let lastPath: string | null = null;

  for (let i = 0; i < pathsToTry.length; i++) {
    const path = pathsToTry[i];
    const fullUrl = `${config.restBaseUrl}${path}`;
    lastPath = path;
    
    // Log seguro de URL (sin secretos)
    if (process.env.NODE_ENV !== "production") {
      console.log("[Skydropx createShipment] Intentando crear shipment:", {
        url: fullUrl,
        baseUrl: config.restBaseUrl,
        path,
        rateId: payload.shipment?.rate_id,
        attempt: i + 1,
      });
    }

    try {
      const response = await skydropxFetch(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return (await response.json()) as SkydropxShipmentResponse;
      }

      // Si es 404 y hay más paths para intentar, continuar
      if (response.status === 404 && i < pathsToTry.length - 1) {
        console.warn(`[Skydropx createShipment] 404 en ${path}, intentando siguiente path...`);
        lastResponse = response;
        continue;
      }

      // Para otros errores o si es el último intento, procesar el error
      lastResponse = response;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < pathsToTry.length - 1) {
        console.warn(`[Skydropx createShipment] Error en ${path}, intentando siguiente path...`);
        continue;
      }
      throw error;
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  if (!lastResponse) {
    throw lastError || new Error("Error al crear envío: No se pudo obtener respuesta de Skydropx");
  }

  const response = lastResponse;

  if (!response.ok) {
    const errorText = await response.text();

    let parsedBody: unknown = null;
    try {
      parsedBody = JSON.parse(errorText);
    } catch {
      parsedBody = null;
    }

    const sanitizedUpstream = parsedBody ? sanitizeSkydropxErrorBody(parsedBody) : null;
    const errorSnippet =
      sanitizedUpstream ? JSON.stringify(sanitizedUpstream) : errorText.substring(0, 200);

    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      baseUrl: config.restBaseUrl,
      pathsAttempted: pathsToTry,
      lastPath,
      upstream: sanitizedUpstream,
      errorSnippet,
    };

    console.error("[Skydropx createShipment] Error:", errorDetails);

    // Extraer primer error para mensaje más útil
    let errorMessage = `Error al crear envío: ${response.statusText || `HTTP ${response.status}`}`;
    if (sanitizedUpstream && typeof sanitizedUpstream === "object") {
      const upstream = sanitizedUpstream as Record<string, unknown>;
      // Intentar obtener primer error desde errors normalizados
      if (Array.isArray(upstream.errors) && upstream.errors.length > 0) {
        const firstError = upstream.errors[0] as { message?: string; field?: string | null };
        if (firstError.message && firstError.message !== "unknown") {
          errorMessage = `Skydropx rechazó el envío: ${firstError.message}${firstError.field ? ` (campo: ${firstError.field})` : ""}`;
        }
      }
      // Fallback a message general si no hay errors parseados
      if (errorMessage === `Error al crear envío: ${response.statusText || `HTTP ${response.status}`}` && typeof upstream.message === "string") {
        errorMessage = `Skydropx rechazó el envío: ${upstream.message}`;
      }
    }

    const error = new Error(errorMessage);
    (error as Error & { code?: string; statusCode?: number; details?: unknown }).statusCode =
      response.status;
    (error as Error & { code?: string; statusCode?: number; details?: unknown }).details =
      errorDetails;

    // Mapear a códigos para diagnóstico en el endpoint
    (error as Error & { code?: string }).code =
      response.status === 400
        ? "skydropx_bad_request"
        : response.status === 422
          ? "skydropx_unprocessable_entity"
          : response.status === 401 || response.status === 403
            ? "skydropx_unauthorized"
            : response.status === 404
              ? "skydropx_not_found"
              : response.status >= 500
                ? "skydropx_upstream_error"
                : "skydropx_error";

    throw error;
  }

  return (await response.json()) as SkydropxShipmentResponse;
}

/**
 * Obtiene un shipment desde Skydropx por ID
 * Útil para polling/rehidratación cuando tracking/label no están disponibles inmediatamente
 * 
 * Hardening: Fallback solo de PATH (no de host):
 * - Intenta primero: /api/v1/shipments/:id
 * - Si 404, intenta: /v1/shipments/:id
 * - NO cambia el host (debe ser api-pro.skydropx.com para OAuth)
 */
export async function getShipment(shipmentId: string): Promise<SkydropxShipmentResponse> {
  const config = getSkydropxConfig();
  if (!config) {
    throw new Error("Skydropx no está configurado");
  }

  // Intentar primero con /api/v1/shipments/:id, luego /v1/shipments/:id (solo path, no host)
  const pathsToTry = [`/api/v1/shipments/${shipmentId}`, `/v1/shipments/${shipmentId}`];
  let lastError: Error | null = null;
  let lastResponse: Response | null = null;
  let lastPath: string | null = null;
  let fallbackUsed = false;

  for (let i = 0; i < pathsToTry.length; i++) {
    const path = pathsToTry[i];
    const fullUrl = `${config.restBaseUrl}${path}`;
    lastPath = path;

    // Log seguro de URL (sin secretos)
    if (process.env.NODE_ENV !== "production") {
      console.log("[Skydropx getShipment] Intentando obtener shipment:", {
        shipmentId,
        url: fullUrl,
        baseUrl: config.restBaseUrl,
        path,
        attempt: i + 1,
        fallbackUsed: i > 0,
      });
    }

    try {
      const response = await skydropxFetch(path, {
        method: "GET",
      });

      if (response.ok) {
        // Si usamos fallback, loguear
        if (i > 0 && process.env.NODE_ENV !== "production") {
          console.log("[Skydropx getShipment] Éxito con path de fallback:", {
            shipmentId,
            path,
            originalPath: pathsToTry[0],
          });
        }
        const responseData = (await response.json()) as SkydropxShipmentResponse;
        
        // Log diagnóstico cuando la respuesta no tiene estructura esperada (para debugging)
        const anyResponse = responseData as any;
        const included = Array.isArray(anyResponse.included) ? anyResponse.included : [];
        const hasData = !!anyResponse.data;
        const hasDataAttributes = !!anyResponse.data?.attributes;
        const includedCount = included.length;
        
        // Verificar si tiene estructura esperada para tracking/label
        const hasIncludedAttributes = included.some((item: any) => item.attributes && typeof item.attributes === "object");
        const hasDataAttributesTracking = !!anyResponse.data?.attributes?.tracking_number || !!anyResponse.data?.attributes?.master_tracking_number;
        
        // Si no tiene estructura esperada, loguear para diagnóstico (siempre, pero sin PII)
        if (!hasIncludedAttributes && !hasDataAttributesTracking && includedCount > 0) {
          const sampleIncludedKeys = included.length > 0 && included[0] ? Object.keys(included[0]).slice(0, 10) : [];
          const dataAttributesKeys = anyResponse.data?.attributes ? Object.keys(anyResponse.data.attributes).slice(0, 10) : [];
          
          console.warn("[Skydropx getShipment] Respuesta OK pero sin estructura esperada para tracking/label:", {
            shipmentId: shipmentId.substring(0, 8) + "...", // Solo primeros 8 chars
            baseUrl: config.restBaseUrl,
            status: response.status,
            includedCount,
            hasData,
            hasDataAttributes,
            hasIncludedAttributes,
            hasDataAttributesTracking,
            sampleIncludedKeys: sampleIncludedKeys.length > 0 ? sampleIncludedKeys : undefined,
            dataAttributesKeys: dataAttributesKeys.length > 0 ? dataAttributesKeys : undefined,
            includedTypesSample: included.slice(0, 3).map((item: any) => item.type || "no-type").filter((t: string) => t !== "no-type"),
          });
        }
        
        return responseData;
      }

      // Si es 404 y hay más paths para intentar, continuar
      if (response.status === 404 && i < pathsToTry.length - 1) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[Skydropx getShipment] 404 en ${path}, intentando siguiente path...`);
        }
        lastResponse = response;
        fallbackUsed = true;
        continue;
      }

      // Para otros errores o si es el último intento, procesar el error
      lastResponse = response;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < pathsToTry.length - 1) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[Skydropx getShipment] Error en ${path}, intentando siguiente path...`);
        }
        fallbackUsed = true;
        continue;
      }
      throw error;
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  if (!lastResponse) {
    throw lastError || new Error("Error al obtener shipment: No se pudo obtener respuesta de Skydropx");
  }

  const response = lastResponse;

  if (!response.ok) {
    const errorText = await response.text();
    let parsedBody: unknown = null;
    try {
      parsedBody = JSON.parse(errorText);
    } catch {
      parsedBody = null;
    }

    const sanitizedUpstream = parsedBody ? sanitizeSkydropxErrorBody(parsedBody) : null;
    const errorSnippet =
      sanitizedUpstream ? JSON.stringify(sanitizedUpstream) : errorText.substring(0, 200);

    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      baseUrl: config.restBaseUrl,
      pathsAttempted: pathsToTry,
      lastPath,
      fallbackUsed,
      upstream: sanitizedUpstream,
      errorSnippet,
    };

    console.error("[Skydropx getShipment] Error:", errorDetails);

    const error = new Error(`Error al obtener shipment: ${response.statusText || `HTTP ${response.status}`}`);
    (error as Error & { code?: string; statusCode?: number; details?: unknown }).statusCode = response.status;
    (error as Error & { code?: string; statusCode?: number; details?: unknown }).details = errorDetails;
    (error as Error & { code?: string }).code =
      response.status === 404
        ? "skydropx_not_found"
        : response.status === 401 || response.status === 403
          ? "skydropx_unauthorized"
          : response.status >= 500
            ? "skydropx_upstream_error"
            : "skydropx_error";

    throw error;
  }

  return (await response.json()) as SkydropxShipmentResponse;
}

/**
 * Extrae tracking_number desde múltiples rutas posibles en la respuesta de Skydropx
 */
function extractTrackingNumber(response: SkydropxShipmentResponse): string | null {
  // Ruta 1: response.master_tracking_number
  if (response.master_tracking_number && typeof response.master_tracking_number === "string") {
    return response.master_tracking_number;
  }

  // Ruta 2: response.data.master_tracking_number
  if (response.data?.master_tracking_number && typeof response.data.master_tracking_number === "string") {
    return response.data.master_tracking_number;
  }

  // Ruta 3: response.tracking_number (usar any para acceder a propiedades dinámicas)
  const anyResponse = response as any;
  if (anyResponse.tracking_number && typeof anyResponse.tracking_number === "string") {
    return anyResponse.tracking_number;
  }

  // Ruta 4: response.data.tracking_number
  if (anyResponse.data?.tracking_number && typeof anyResponse.data.tracking_number === "string") {
    return anyResponse.data.tracking_number;
  }

  // Ruta 5: response.tracking (alias)
  if (anyResponse.tracking && typeof anyResponse.tracking === "string") {
    return anyResponse.tracking;
  }

  // Ruta 6: Buscar en included packages
  if (response.included && Array.isArray(response.included)) {
    for (const pkg of response.included) {
      const anyPkg = pkg as any;
      if (anyPkg.tracking_number && typeof anyPkg.tracking_number === "string") {
        return anyPkg.tracking_number;
      }
    }
  }

  // Ruta 7: Buscar en (response as any).shipment.tracking_number
  if (anyResponse.shipment?.tracking_number && typeof anyResponse.shipment.tracking_number === "string") {
    return anyResponse.shipment.tracking_number;
  }

  if (anyResponse.shipment?.master_tracking_number && typeof anyResponse.shipment.master_tracking_number === "string") {
    return anyResponse.shipment.master_tracking_number;
  }

  return null;
}

/**
 * Extrae label_url desde múltiples rutas posibles en la respuesta de Skydropx
 */
function extractLabelUrlFromResponse(response: SkydropxShipmentResponse): string | null {
  // Ruta 1: Buscar en included packages
  if (response.included && Array.isArray(response.included)) {
    for (const pkg of response.included) {
      if (pkg.label_url && typeof pkg.label_url === "string") {
        return pkg.label_url;
      }
    }
  }

  // Ruta 2: response.label_url (usar any para acceder a propiedades dinámicas)
  const anyResponse = response as any;
  if (anyResponse.label_url && typeof anyResponse.label_url === "string") {
    return anyResponse.label_url;
  }

  // Ruta 3: response.data.label_url
  if (anyResponse.data?.label_url && typeof anyResponse.data.label_url === "string") {
    return anyResponse.data.label_url;
  }

  // Ruta 4: response.label_url_pdf
  if (anyResponse.label_url_pdf && typeof anyResponse.label_url_pdf === "string") {
    return anyResponse.label_url_pdf;
  }

  // Ruta 5: Buscar en files.label
  if (anyResponse.files?.label && typeof anyResponse.files.label === "string") {
    return anyResponse.files.label;
  }

  if (anyResponse.shipment?.label_url && typeof anyResponse.shipment.label_url === "string") {
    return anyResponse.shipment.label_url;
  }

  return null;
}

/**
 * Crea un envío en Skydropx a partir de un rate ID
 * Esta función simplifica la creación de envíos cuando ya se tiene un rate_id
 * 
 * Si tracking_number o label_url no están disponibles inmediatamente, hace polling
 * hasta obtenerlos o hasta timeout (~8s).
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
  consignmentNote?: string; // Código Carta Porte (SAT) - requerido para PRO
  packageType?: string; // Código tipo empaque (SAT) - requerido para PRO
}): Promise<{
  trackingNumber: string | null;
  labelUrl: string | null;
  rawId: string | null;
  pollingInfo?: {
    attempts: number;
    elapsedMs: number;
  };
}> {
  const config = getSkydropxConfig();
  if (!config) {
    throw new Error("Skydropx no está configurado");
  }

  const fromPhone = sanitizeMxPhoneDigits(input.addressFrom.phone);
  const toPhone = sanitizeMxPhoneDigits(input.addressTo.phone);

  // Construir payload PRO para crear shipment (wrapper { shipment: { ... } })
  const shipmentPayload: SkydropxShipmentPayload = {
    shipment: {
      rate_id: input.rateExternalId,
      address_from: {
        country: input.addressFrom.countryCode || "MX",
        country_code: input.addressFrom.countryCode || "MX",
        zip: input.addressFrom.postalCode,
        postal_code: input.addressFrom.postalCode,
        city: input.addressFrom.city,
        state: input.addressFrom.state,
        province: input.addressFrom.state,
        street1: input.addressFrom.address1,
        address1: input.addressFrom.address1,
        name: input.addressFrom.name,
        company: "DDN",
        reference: "Sin referencia",
        phone: fromPhone,
        email: input.addressFrom.email || null,
      },
      address_to: {
        country: input.addressTo.countryCode || "MX",
        country_code: input.addressTo.countryCode || "MX",
        zip: input.addressTo.postalCode,
        postal_code: input.addressTo.postalCode,
        city: input.addressTo.city,
        state: input.addressTo.state,
        province: input.addressTo.state,
        street1: input.addressTo.address1,
        address1: input.addressTo.address1,
        name: input.addressTo.name,
        company: "Particular",
        reference: "Sin referencia",
        phone: toPhone,
        email: input.addressTo.email || null,
      },
      packages: input.parcels.map((p, idx) => ({
        package_number: String(idx + 1),
        package_protected: false,
        weight: p.weight,
        height: p.height,
        width: p.width,
        length: p.length,
        consignment_note: input.consignmentNote || "",
        package_type: input.packageType || "",
      })),
      declared_value: 0,
      printing_format: "standard",
    },
  };

  if (process.env.NODE_ENV !== "production") {
    console.log("[Skydropx createShipmentFromRate] Creando envío:", {
      baseUrl: config.restBaseUrl,
      method: "POST",
      rate_id: input.rateExternalId,
      from: `${input.addressFrom.city}, ${input.addressFrom.postalCode}`,
      to: `${input.addressTo.city}, ${input.addressTo.postalCode}`,
      packages: input.parcels.length,
    });
  }

  // Llamar a createShipment
  const response = await createShipment(shipmentPayload);

  // Extraer shipment_id (siempre debe estar presente si el shipment se creó)
  const rawId = response.id || response.data?.id || (response as any).shipment?.id || null;

  if (!rawId) {
    // Si no hay shipment_id, el shipment no se creó correctamente
    throw new Error("No se recibió shipment_id de Skydropx. El envío no se creó correctamente.");
  }

  // Extraer tracking_number y label_url usando funciones tolerantes
  let trackingNumber = extractTrackingNumber(response);
  let labelUrl = extractLabelUrlFromResponse(response);

  if (process.env.NODE_ENV !== "production") {
    console.log("[Skydropx createShipmentFromRate] Envío creado:", {
      shipmentId: rawId,
      trackingNumber: trackingNumber || "[pendiente]",
      labelUrl: labelUrl ? "presente" : "[pendiente]",
    });
  }

  // Si tracking_number o label_url no están disponibles, hacer polling
  if (!trackingNumber || !labelUrl) {
    const maxAttempts = 12;
    const pollIntervalMs = 700; // ~700ms entre intentos (respetando rate limit de 2 req/s)
    const timeoutMs = 8000; // ~8 segundos timeout

    const startTime = Date.now();
    let attempts = 0;
    let lastResponse = response;

    while (attempts < maxAttempts) {
      attempts++;
      const elapsedMs = Date.now() - startTime;

      if (elapsedMs >= timeoutMs) {
        // Timeout: devolver lo que tenemos (shipment_id) pero sin tracking
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Skydropx createShipmentFromRate] Timeout en polling:", {
            shipmentId: rawId,
            attempts,
            elapsedMs,
            hasTracking: trackingNumber !== null && trackingNumber !== "",
            hasLabel: labelUrl !== null && labelUrl !== "",
          });
        }

        return {
          trackingNumber,
          labelUrl,
          rawId,
          pollingInfo: {
            attempts,
            elapsedMs,
          },
        };
      }

      // Esperar antes de hacer el siguiente intento (excepto el primero)
      if (attempts > 1) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }

      try {
        const pollResponse = await getShipment(rawId);
        lastResponse = pollResponse;

        // Intentar extraer tracking y label nuevamente
        const pollTracking = extractTrackingNumber(pollResponse);
        const pollLabel = extractLabelUrlFromResponse(pollResponse);

        if (pollTracking) {
          trackingNumber = pollTracking;
        }
        if (pollLabel) {
          labelUrl = pollLabel;
        }

        // Si ya tenemos ambos, salir del loop
        if (trackingNumber && labelUrl) {
          if (process.env.NODE_ENV !== "production") {
            console.log("[Skydropx createShipmentFromRate] Polling exitoso:", {
              shipmentId: rawId,
              attempts,
              elapsedMs: Date.now() - startTime,
              trackingNumber,
              hasLabel: labelUrl !== null && labelUrl !== "",
            });
          }
          break;
        }
      } catch (pollError) {
        // Si falla el polling, continuar con el siguiente intento
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Skydropx createShipmentFromRate] Error en polling (intento", attempts, "):", pollError);
        }
        // Continuar con el siguiente intento
      }
    }

    // Si salimos del loop sin obtener tracking/label, devolver lo que tenemos
    const finalElapsedMs = Date.now() - startTime;
    if (!trackingNumber && !labelUrl) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Skydropx createShipmentFromRate] Polling completado sin tracking/label:", {
          shipmentId: rawId,
          attempts,
          elapsedMs: finalElapsedMs,
        });
      }
    }

    return {
      trackingNumber,
      labelUrl,
      rawId,
      pollingInfo: {
        attempts,
        elapsedMs: finalElapsedMs,
      },
    };
  }

  // Si ya tenemos tracking y label, retornar directamente
  return {
    trackingNumber,
    labelUrl,
    rawId,
  };
}

