// src/lib/utils/images.ts
import {
  tryParseUrl,
  isAllowedImageHost,
  appendLhSizeParam,
} from "@/lib/utils/url";

export function normalizeImageUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  let raw = ("" + u).trim();
  if (!raw || raw === "null" || raw === "undefined") return undefined;

  // Drive file?id=...  ->  https://lh3.googleusercontent.com/d/ID
  const m = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && !raw.includes("lh3.googleusercontent.com")) {
    raw = `https://lh3.googleusercontent.com/d/${m[1]}`;
  }

  // fuerza https
  if (raw.startsWith("//")) raw = "https:" + raw;
  if (raw.startsWith("http://")) raw = raw.replace(/^http:\/\//, "https://");

  const url = tryParseUrl(raw);
  if (!url) return undefined;
  if (!isAllowedImageHost(url.hostname)) return undefined;

  const sized = appendLhSizeParam(url, 800);
  return sized.toString();
}
