export function normalizeImageUrl(raw?: string | null, size = 800) {
  if (!raw) return "/images/fallback-product.png";
  try {
    const u = new URL(raw);

    // Caso típico: https://drive.google.com/uc?export=view&id=FILE_ID
    if (u.hostname === "drive.google.com" && u.pathname === "/uc") {
      const id = u.searchParams.get("id");
      if (id) {
        // Usa el CDN de googleusercontent, mucho más estable para next/image
        return `https://lh3.googleusercontent.com/d/${id}=w${size}-h${size}`;
      }
    }

    return raw;
  } catch {
    return "/images/fallback-product.png";
  }
}
