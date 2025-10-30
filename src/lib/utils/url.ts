// src/lib/utils/url.ts
export const ALLOWED_IMG_HOSTS = new Set<string>([
  "images.unsplash.com",
  // hosts explícitos adicionales pueden agregarse aquí
]);

export function tryParseUrl(raw?: string | null): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

export function isAllowedImageHost(u: URL): boolean {
  const h = u.hostname;
  if (/^lh\d+\.googleusercontent\.com$/i.test(h)) return true;
  if (/^[^.]+\.googleusercontent\.com$/i.test(h)) return true; // comodín de subdominio simple
  if (ALLOWED_IMG_HOSTS.has(h)) return true;
  return false;
}

export function appendSizeParamForLh(url: URL, px: number): URL {
  const h = url.hostname;
  if (!/^lh\d+\.googleusercontent\.com$/i.test(h)) return url;
  const path = url.pathname;
  if (path.includes("=s") || path.includes("=w") || path.includes("-h"))
    return url;
  const u = new URL(url.toString());
  u.pathname = path + `=s${px}`;
  return u;
}

// Valida una URL de imagen segura y, si es inválida o host no permitido, devuelve undefined
export function validateImageUrl(raw?: string | null): string | undefined {
  const u = tryParseUrl(raw);
  if (!u) return undefined;
  if (!isAllowedImageHost(u)) return undefined;
  return u.toString();
}
