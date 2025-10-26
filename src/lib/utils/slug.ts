export function normalizeSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/\s+/g, "-") // espacios por guiones
    .replace(/[^a-z0-9-]/g, "") // solo letras, números y guiones
    .replace(/-+/g, "-") // múltiples guiones por uno
    .replace(/^-|-$/g, ""); // quitar guiones al inicio/final
}

// diccionario mínimo de correcciones frecuentes
const fixes: Record<string, string> = {
  'cermico': 'ceramico',
  'cartn': 'carton',
  'tubeos': 'tubos',
  'bracket': 'bracket',
  'braquet': 'bracket',
  'arco': 'arco',
  'resorte': 'resorte',
  'niti': 'niti',
  'niquel': 'niquel',
  'titanio': 'titanio',
  'rectangular': 'rectangular',
  'redondo': 'redondo',
  'paquete': 'paquete',
  'con': 'con',
  '10': '10',
  '12': '12',
  '14': '14',
  '16': '16',
  '18': '18',
  'malla': 'malla',
  '100': '100',
  'colado': 'colado',
  'roth': 'roth',
  'azdent': 'azdent',
  'mbt': 'mbt',
  'edgewise': 'edgewise',
  'autoligado': 'autoligado',
  'instrumento': 'instrumento',
  'tubos': 'tubos',
  '1eros': '1eros',
  '2o': '2o',
  'molar': 'molar',
  'kit': 'kit',
  '200': '200',
  'pieza': 'pieza',
  'alta': 'alta',
  'luz': 'luz',
  'led': 'led',
  '30': '30',
  'dias': 'dias',
  'garantia': 'garantia',
};

export function autocorrect(s: string) {
  const n = normalizeSlug(s);
  for (const k of Object.keys(fixes)) {
    if (n.includes(k)) return n.replace(k, fixes[k]);
  }
  return n;
}

// Búsqueda fuzzy simple
export function fuzzySearch(target: string, candidates: string[], threshold = 0.7): string | null {
  const normalized = normalizeSlug(target);
  
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeSlug(candidate);
    
    // Coincidencia exacta
    if (normalized === normalizedCandidate) {
      return candidate;
    }
    
    // Coincidencia parcial (incluye)
    if (normalizedCandidate.includes(normalized) || normalized.includes(normalizedCandidate)) {
      return candidate;
    }
    
    // Distancia de Levenshtein simple
    const distance = levenshteinDistance(normalized, normalizedCandidate);
    const maxLength = Math.max(normalized.length, normalizedCandidate.length);
    const similarity = 1 - (distance / maxLength);
    
    if (similarity >= threshold) {
      return candidate;
    }
  }
  
  return null;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[b.length][a.length];
}
