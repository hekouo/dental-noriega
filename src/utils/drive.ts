// src/utils/drive.ts
function extractId(url: string = ""): string | null {
  const u = url.replace(/^\uFEFF/, "").trim();
  return u.match(/id=([^&]+)/)?.[1] || u.match(/file\/d\/([^/]+)/)?.[1] || null;
}

/** Variante A: binario directo */
export function toUsercontent(url: string = ""): string {
  const id = extractId(url);
  return id
    ? `https://drive.usercontent.google.com/uc?id=${id}&export=download`
    : url.trim();
}

/** Variante B: vista embebible */
export function toUcView(url: string = ""): string {
  const id = extractId(url);
  return id ? `https://drive.google.com/uc?export=view&id=${id}` : url.trim();
}

/** Variante C: proxy (evita bloqueos/hotlink) */
export function toImageProxy(url: string = ""): string {
  const clean = url
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^https?:\/\//, "");
  const ts = Date.now(); // cache-buster
  return `https://images.weserv.nl/?url=${encodeURIComponent(clean)}&t=${ts}`;
}
