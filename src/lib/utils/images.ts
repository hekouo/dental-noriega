// src/lib/utils/images.ts
import { tryParseUrl, validateImageUrl } from "@/lib/utils/url";

export function normalizeImageUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  let raw = ("" + u).trim();
  if (!raw || raw === "null" || raw === "undefined") return undefined;

  // Si viene como link de Drive con ?id=..., convertir a lh3 estrictamente
  const asUrl = tryParseUrl(raw);
  if (asUrl && asUrl.hostname === "drive.google.com") {
    const id = asUrl.searchParams.get("id");
    if (id && /^[a-zA-Z0-9_-]+$/.test(id)) {
      raw = `https://lh3.googleusercontent.com/d/${id}`;
    }
  }

  // Forzar https si vino como //host/...
  if (raw.startsWith("//")) raw = "https:" + raw;

  // Validación final por host permitido
  return validateImageUrl(raw);
}
