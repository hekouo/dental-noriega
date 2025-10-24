// Listado exacto de secciones válidas
export const SECTIONS = [
  "consumibles-y-profilaxis",
  "equipos", 
  "instrumental-clinico",
  "instrumental-ortodoncia",
  "ortodoncia-accesorios-y-retenedores",
  "ortodoncia-arcos-y-resortes",
  "ortodoncia-brackets-y-tubos"
] as const;

export type SectionSlug = typeof SECTIONS[number];

// Orden de prioridad para heurística de sección
export const ORDER_OF_GUESS: SectionSlug[] = [
  "ortodoncia-brackets-y-tubos",      // Más específico primero
  "ortodoncia-arcos-y-resortes",
  "ortodoncia-accesorios-y-retenedores", 
  "instrumental-ortodoncia",
  "instrumental-clinico",
  "equipos",
  "consumibles-y-profilaxis"          // Más general al final
];

// Mapeo de keywords a secciones para heurística
export const SECTION_KEYWORDS: Record<string, SectionSlug[]> = {
  "bracket": ["ortodoncia-brackets-y-tubos"],
  "brackets": ["ortodoncia-brackets-y-tubos"],
  "tubo": ["ortodoncia-brackets-y-tubos"],
  "tubos": ["ortodoncia-brackets-y-tubos"],
  "arco": ["ortodoncia-arcos-y-resortes"],
  "arcos": ["ortodoncia-arcos-y-resortes"],
  "resorte": ["ortodoncia-arcos-y-resortes"],
  "resortes": ["ortodoncia-arcos-y-resortes"],
  "niti": ["ortodoncia-arcos-y-resortes"],
  "niquel": ["ortodoncia-arcos-y-resortes"],
  "titanio": ["ortodoncia-arcos-y-resortes"],
  "retenedor": ["ortodoncia-accesorios-y-retenedores"],
  "retenedores": ["ortodoncia-accesorios-y-retenedores"],
  "accesorio": ["ortodoncia-accesorios-y-retenedores"],
  "accesorios": ["ortodoncia-accesorios-y-retenedores"],
  "gancho": ["instrumental-ortodoncia"],
  "ganchos": ["instrumental-ortodoncia"],
  "instrumento": ["instrumental-ortodoncia", "instrumental-clinico"],
  "instrumentos": ["instrumental-ortodoncia", "instrumental-clinico"],
  "quirurgico": ["instrumental-ortodoncia", "instrumental-clinico"],
  "luz": ["equipos"],
  "led": ["equipos"],
  "equipo": ["equipos"],
  "equipos": ["equipos"],
  "consumible": ["consumibles-y-profilaxis"],
  "consumibles": ["consumibles-y-profilaxis"],
  "profilaxis": ["consumibles-y-profilaxis"],
};
