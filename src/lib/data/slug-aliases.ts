// Alias específicos por slug
export const ALIASES: Record<string, string[]> = {
  // Brackets
  "brackets-carton-mbt-roth-edgewise": ["brackets-cartn-mbt-roth-edgewise"],
  "bracket-ceramico-roth-azdent": ["bracket-cermico-roth-azdent"],
  "bracket-ceramico-roth": ["bracket-cermico-roth"],
  "bracket-carton-roth": ["bracket-cartn-roth"],
  
  // Arcos
  "arco-niti-rectangular-paquete-con-10": ["arco-niquel-rectangular-paquete-con-10"],
  "arco-niti-redondo-paquete-con-10": ["arco-niquel-redondo-paquete-con-10"],
  
  // Instrumentos
  "gancho-quirurgico-kit-con-10": ["gancho-quirurgico-kit-10"],
  "tubos-molares-1eros": ["tubos-molar-1eros"],
  "tubos-molares-2o": ["tubos-molar-2o"],
  
  // Equipos
  "luz-led-alta-potencia-30-dias-garantia": ["luz-led-alta-30-dias-garantia"],
};

// Autocorrecciones simples de typos
export const TYPO_MAP: Record<string, string> = {
  // Typos comunes
  "cermico": "ceramico",
  "cartn": "carton", 
  "braquet": "bracket",
  "brackets": "bracket",
  "tubeos": "tubos",
  "niti": "niquel",
  "niquel": "niti",
  "titanio": "titanio",
  "rectangular": "rectangular",
  "redondo": "redondo",
  "paquete": "paquete",
  "con": "con",
  "malla": "malla",
  "colado": "colado",
  "roth": "roth",
  "azdent": "azdent",
  "mbt": "mbt",
  "edgewise": "edgewise",
  "autoligado": "autoligado",
  "instrumento": "instrumento",
  "quirurgico": "quirurgico",
  "molares": "molar",
  "molar": "molares",
  "kit": "kit",
  "alta": "alta",
  "luz": "luz",
  "led": "led",
  "potencia": "potencia",
  "dias": "dias",
  "garantia": "garantia",
  
  // Números
  "10": "10",
  "12": "12", 
  "14": "14",
  "16": "16",
  "18": "18",
  "30": "30",
  "100": "100",
  "200": "200",
  "1eros": "1eros",
  "2o": "2o",
};
