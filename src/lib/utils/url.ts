// src/lib/utils/url.ts
export function tryParseUrl(u?: string | null): URL | null {
  if (!u) return null;
  try {
    return new URL(u);
  } catch {
    return null;
  }
}

export function isAllowedImageHost(h: string): boolean {
  return h === "lh3.googleusercontent.com" || h === "images.unsplash.com";
}

export function appendLhSizeParam(url: URL, px = 800): URL {
  if (url.hostname !== "lh3.googleusercontent.com") return url;

  // Mantén params existentes; si no hay tamaño, agrega =s{px} al pathname
  if (!/=s\d+/.test(url.pathname)) url.pathname += `=s${px}`;

  return url;
}
