// src/lib/utils/url.ts
export const ALLOWED_IMG_HOSTS = new Set<string>([
  "lh3.googleusercontent.com",
  "images.unsplash.com",
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
  return ALLOWED_IMG_HOSTS.has(u.hostname);
}

// Valida una URL de imagen segura y, si es inválida o host no permitido, devuelve undefined
export function validateImageUrl(raw?: string | null): string | undefined {
  const u = tryParseUrl(raw);
  if (!u) return undefined;
  if (!isAllowedImageHost(u)) return undefined;
  return u.toString();
}
