/**
 * Helpers para URLs de WhatsApp (wa.me) y normalización de teléfono MX.
 * PR-H11: links + mensaje prellenado; sin tocar pagos/envíos/admin.
 */

/** Quita espacios, guiones, paréntesis; deja solo dígitos */
function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Normaliza un teléfono mexicano a dígitos para wa.me (52 + 10 dígitos).
 * - Quita espacios, guiones, paréntesis.
 * - Si empieza con +52 o 52, normaliza a últimos 10 y antepone 52.
 * - Si son 10 dígitos, asume MX y antepone 52.
 * @returns "52" + 10 dígitos o null si no es válido
 */
export function normalizePhoneMX(input: string): string | null {
  const d = digitsOnly(input);
  if (d.length === 10 && /^\d{10}$/.test(d)) {
    return "52" + d;
  }
  if (d.length >= 10 && (d.startsWith("52") || d.startsWith("521"))) {
    const ten = d.slice(-10);
    if (/^\d{10}$/.test(ten)) return "52" + ten;
  }
  return null;
}

/**
 * Construye URL de WhatsApp (wa.me) con mensaje prellenado.
 * @param phoneE164OrMX - Teléfono solo dígitos (sin +), ej. 525531033715
 * @param text - Mensaje a prellenar
 */
export function buildWhatsAppUrl(params: {
  phoneE164OrMX: string;
  text: string;
}): string {
  const digits = digitsOnly(params.phoneE164OrMX);
  const encoded = encodeURIComponent(params.text);
  return `https://wa.me/${digits || "0"}?text=${encoded}`;
}
