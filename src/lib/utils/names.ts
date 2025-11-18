/**
 * Divide un nombre completo en nombre y apellidos
 * @param fullName - Nombre completo (ej: "Juan Pérez García")
 * @returns Objeto con firstName y lastName
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  // Primera palabra es el nombre, el resto son apellidos
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Construye un nombre completo a partir de nombre y apellidos
 * @param firstName - Nombre
 * @param lastName - Apellidos
 * @returns Nombre completo normalizado (trim)
 */
export function buildFullName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();

  if (!first && !last) {
    return "";
  }

  if (!last) {
    return first;
  }

  return `${first} ${last}`.trim();
}

