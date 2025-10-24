// Heurística por palabras clave, override por mapping explícito
const SECTION_OVERRIDES: Record<string, string> = {
  "arco-niti-redondo-12-14-16-18-paquete-con-10": "ortodoncia-arcos-y-resortes",
  "arco-niti-rectangular-paquete-con-10": "ortodoncia-arcos-y-resortes",
  "brackets-cartn-mbt-roth-edgewise": "ortodoncia-brackets-y-tubos",
  "bracket-azdent-malla-100-colado": "ortodoncia-brackets-y-tubos",
  "bracket-cermico-roth-azdent": "ortodoncia-brackets-y-tubos",
  "braquet-de-autoligado-con-instrumento": "ortodoncia-brackets-y-tubos",
};

const KEYWORD_TO_SECTION: Array<[RegExp, string]> = [
  [/bracket|braquet/i, "ortodoncia-brackets-y-tubos"],
  [/arco|resorte/i, "ortodoncia-arcos-y-resortes"],
  [/resina|restaur/i, "restauracion"],
  [/profilaxis|consumible/i, "consumibles-y-profilaxis"],
];

export function guessSectionForFeaturedSlug(
  slug: string,
  fallback = "consumibles-y-profilaxis",
) {
  if (SECTION_OVERRIDES[slug]) return SECTION_OVERRIDES[slug];
  for (const [re, sec] of KEYWORD_TO_SECTION) if (re.test(slug)) return sec;
  return fallback;
}
