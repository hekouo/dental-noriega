// src/lib/utils/images.ts
export function normalizeImageUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  let url = u.trim();

  // Vacíos, "null", "undefined"
  if (!url || url === "null" || url === "undefined") return undefined;

  // Reemplazar URLs de Drive comunes por lh3 si vienen crudas
  // Ej: https://drive.google.com/uc?id=<id> → https://lh3.googleusercontent.com/d/<id>
  const m = url.match(/[\?&]id=([a-zA-Z0-9_-]+)/);
  if (m && !/lh3\.googleusercontent\.com/.test(url)) {
    url = `https://lh3.googleusercontent.com/d/${m[1]}`;
  }

  // Quitar query basura típica
  url = url.replace(/[?&](usp|pli|export|resourcekey)=[^&]+/g, "");

  // Forzar https
  if (url.startsWith("//")) url = "https:" + url;
  if (url.startsWith("http://")) url = url.replace(/^http:\/\//, "https://");

  return url;
}
