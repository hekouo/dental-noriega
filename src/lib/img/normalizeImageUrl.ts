export function normalizeImageUrl(raw?: string | null, size = 800) {
  if (!raw) return "/images/fallback-product.png";
  try {
    const u = new URL(raw);
    if (u.hostname === "drive.google.com" && u.pathname === "/uc") {
      const id = u.searchParams.get("id");
      if (id)
        return `https://lh3.googleusercontent.com/d/${id}=w${size}-h${size}-c`;
    }
    return raw;
  } catch {
    return "/images/fallback-product.png";
  }
}
