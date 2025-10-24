// Diccionario mínimo de correcciones frecuentes
const fixes: Record<string, string> = {
  'cermico': 'ceramico',
  'cartn': 'carton',
  'tubeos': 'tubos',
  'bracket': 'bracket',
  'braquet': 'bracket',
  'arco': 'arco',
  'niti': 'niti',
  'rectangular': 'rectangular',
  'redondo': 'redondo',
  'paquete': 'paquete',
  'con': 'con',
  'malla': 'malla',
  'colado': 'colado',
  'roth': 'roth',
  'azdent': 'azdent',
  'autoligado': 'autoligado',
  'instrumento': 'instrumento',
  'mbt': 'mbt',
  'edgewise': 'edgewise',
  'ceramico': 'ceramico',
  'tubos': 'tubos',
  '1eros': '1eros',
  '2o': '2o',
  'molar': 'molar',
  'kit': 'kit',
  'pieza': 'pieza',
  'alta': 'alta',
  'luz': 'luz',
  'led': 'led',
  'dias': 'dias',
  'garantia': 'garantia',
};

export function normalizeSlug(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function autocorrect(s: string) {
  const n = normalizeSlug(s);
  for (const k of Object.keys(fixes)) {
    if (n.includes(k)) return n.replace(k, fixes[k]);
  }
  return n;
}

// Búsqueda fuzzy simple
export function fuzzySearch(target: string, candidates: string[], threshold = 0.7): string | null {
  const normalizedTarget = normalizeSlug(target);
  
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeSlug(candidate);
    
    // Coincidencia exacta
    if (normalizedTarget === normalizedCandidate) {
      return candidate;
    }
    
    // Coincidencia parcial (incluye)
    if (normalizedTarget.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedTarget)) {
      const score = Math.min(normalizedTarget.length, normalizedCandidate.length) / 
                   Math.max(normalizedTarget.length, normalizedCandidate.length);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = candidate;
      }
    }
    
    // Distancia de Levenshtein simple
    const distance = levenshteinDistance(normalizedTarget, normalizedCandidate);
    const maxLength = Math.max(normalizedTarget.length, normalizedCandidate.length);
    const score = 1 - (distance / maxLength);
    
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = candidate;
    }
  }
  
  return bestMatch;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
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
