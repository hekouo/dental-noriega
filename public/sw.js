/**
 * Service Worker manual para PWA mínima
 * Solo se registra si NEXT_PUBLIC_ENABLE_PWA === "true"
 * 
 * Estrategias:
 * - Precache: offline.html, manifest, icons
 * - Runtime cache: assets estáticos (_next/static/*), imágenes locales
 * - NO cachea: APIs, Stripe, Supabase Auth/DB, métodos no-GET
 */

const CACHE_NAME = 'ddn-pwa-v1';
const OFFLINE_URL = '/offline.html';

// Assets para precachear (solo esenciales)
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  // Icons (si existen)
  '/icon-192.png',
  '/icon-512.png',
];

// Dominios permitidos para cache de imágenes remotas (solo lectura)
const ALLOWED_IMAGE_DOMAINS = [
  'lh3.googleusercontent.com',
  'supabase.co', // Solo para storage público de imágenes
];

// Dominios que NUNCA deben cachearse
const BLOCKED_DOMAINS = [
  'api.stripe.com',
  'checkout.stripe.com',
  'hooks.stripe.com',
  'js.stripe.com',
];

// Rutas que NUNCA deben cachearse
const BLOCKED_PATHS = [
  '/api/',
];

// Límite de entradas en cache runtime (evitar llenar storage)
const MAX_CACHE_ENTRIES = 60;

/**
 * Instalación: precachear assets esenciales
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })))
          .catch((err) => {
            // Si algún asset falla, no bloquear la instalación
            console.warn('[SW] Precache falló parcialmente:', err);
          });
      })
      .then(() => {
        // Forzar activación inmediata (skip waiting)
        return self.skipWaiting();
      })
  );
});

/**
 * Activación: limpiar caches antiguos
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

/**
 * Helper: verificar si una URL debe cachearse
 */
function shouldCache(url) {
  const urlObj = new URL(url);
  
  // NO cachear métodos no-GET
  // (esto se verifica en el fetch handler, pero por seguridad)
  
  // NO cachear dominios bloqueados
  if (BLOCKED_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
    return false;
  }
  
  // NO cachear rutas bloqueadas
  if (BLOCKED_PATHS.some(path => urlObj.pathname.startsWith(path))) {
    return false;
  }
  
  // NO cachear requests a Supabase que NO sean imágenes públicas
  if (urlObj.hostname.includes('supabase.co')) {
    // Solo permitir storage público de imágenes
    if (!urlObj.pathname.includes('/storage/v1/object/public/')) {
      return false;
    }
  }
  
  return true;
}

/**
 * Helper: verificar si es una imagen
 */
function isImage(url) {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
  const pathname = new URL(url).pathname.toLowerCase();
  return imageExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * Helper: verificar si es asset estático de Next.js
 */
function isStaticAsset(url) {
  return url.includes('/_next/static/');
}

/**
 * Helper: verificar si es imagen remota permitida
 */
function isAllowedRemoteImage(url) {
  const urlObj = new URL(url);
  return ALLOWED_IMAGE_DOMAINS.some(domain => urlObj.hostname.includes(domain)) && isImage(url);
}

/**
 * Helper: limpiar cache si excede límite
 */
async function enforceCacheLimit(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_CACHE_ENTRIES) {
    // Eliminar las entradas más antiguas (simple: eliminar las primeras)
    const toDelete = keys.slice(0, keys.length - MAX_CACHE_ENTRIES);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

/**
 * Fetch: estrategia de cache
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // NO cachear métodos no-GET
  if (request.method !== 'GET') {
    return; // Dejar pasar sin cache
  }
  
  // NO cachear si está bloqueado
  if (!shouldCache(request.url)) {
    return; // Dejar pasar sin cache
  }
  
  // Estrategia según tipo de recurso
  if (isStaticAsset(request.url)) {
    // Assets estáticos: Cache First (más rápido)
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(request).then((response) => {
            if (response.ok) {
              const cache = caches.open(CACHE_NAME);
              cache.then((c) => {
                c.put(request, response.clone());
                enforceCacheLimit(c);
              });
            }
            return response;
          });
        })
    );
  } else if (isImage(request.url) && (url.origin === self.location.origin || isAllowedRemoteImage(request.url))) {
    // Imágenes locales o remotas permitidas: Stale-While-Revalidate
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
              enforceCacheLimit(cache);
            }
            return response;
          }).catch(() => {
            // Si falla fetch y hay cache, usar cache
            return cached;
          });
          
          // Retornar cache inmediatamente si existe, mientras se actualiza en background
          return cached || fetchPromise;
        });
      })
    );
  } else if (request.mode === 'navigate') {
    // Navegación (HTML): Network First con fallback offline
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Si la respuesta es OK, cachearla (solo para páginas visitadas)
          if (response.ok && url.origin === self.location.origin) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => {
              c.put(request, response.clone());
              enforceCacheLimit(c);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla, intentar cache
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Si no hay cache, mostrar offline fallback
            return caches.match(OFFLINE_URL);
          });
        })
    );
  } else {
    // Otros recursos: Network First
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => {
              c.put(request, response.clone());
              enforceCacheLimit(cache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});
