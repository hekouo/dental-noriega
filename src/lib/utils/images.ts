// src/lib/utils/images.ts
import {
  tryParseUrl,
  isAllowedImageHost,
  appendSizeParamForLh,
} from "@/lib/utils/url";

export function normalizeImageUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  let raw = ("" + u).trim();
  if (!raw || raw === "null" || raw === "undefined") return undefined;

  // Drive file?id=...  ->  https://lh3.googleusercontent.com/d/ID
  const m = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && !/\.googleusercontent\.com/i.test(raw)) {
    raw = `https://lh3.googleusercontent.com/d/${m[1]}`;
  }

  // fuerza https
  if (raw.startsWith("//")) raw = "https:" + raw;
  if (raw.startsWith("http://")) raw = raw.replace(/^http:\/\//, "https://");

  const parsed = tryParseUrl(raw);
  if (!parsed) return undefined;
  if (!isAllowedImageHost(parsed.hostname)) return undefined;

  // asegurar tamaño para lhX
  const withSize = appendSizeParamForLh(parsed.toString(), 800);
  return withSize;
}
