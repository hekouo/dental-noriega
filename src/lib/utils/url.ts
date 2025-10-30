// src/lib/utils/url.ts
export function tryParseUrl(u?: string | null): URL | null {
  try {
    if (!u) return null;
    return new URL(String(u));
  } catch {
    return null;
  }
}

export function isAllowedImageHost(hostname: string): boolean {
  if (/^lh3\.googleusercontent\.com$/i.test(hostname)) return true;
  // Permitir diagnóstico de variantes sin romper UI
  if (/^lh[4-6]\.googleusercontent\.com$/i.test(hostname)) return true;
  if (/\.googleusercontent\.com$/i.test(hostname)) return true;
  if (/^images\.unsplash\.com$/i.test(hostname)) return true;
  return false;
}

// Si es lhX.googleusercontent.com y no tiene tamaño, añade =s{px}
export function appendSizeParamForLh(urlStr: string, px: number): string {
  const u = tryParseUrl(urlStr);
  if (!u) return urlStr;
  const host = u.hostname;
  if (!/^lh\d+\.googleusercontent\.com$/i.test(host)) return urlStr;
  // Si ya trae sufijo de tamaño, no tocar
  const full = u.toString();
  if (/=s\d+(\-c)?$/i.test(u.pathname) || /=s\d+(\-c)?$/i.test(u.search))
    return full;
  return full + `=s${px}`;
}
