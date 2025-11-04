// src/lib/shipping/config.ts
/**
 * Configuración de envío por zonas y tarifas
 */

export type ShippingZone = "metro" | "nacional";

/**
 * Determina la zona de envío basada en el código postal
 * @param cp Código postal de 5 dígitos
 * @returns Zona de envío: "metro" (00000-16999) o "nacional" (17000-99999)
 */
export function cpToZone(cp: string): ShippingZone {
  const cpNum = parseInt(cp.replace(/\D/g, ""), 10);
  if (isNaN(cpNum)) return "nacional";
  
  // Metro: 00000-16999
  if (cpNum >= 0 && cpNum <= 16999) {
    return "metro";
  }
  
  // Nacional: 17000-99999
  return "nacional";
}

/**
 * Tarifas por kg por zona
 */
const TARIFFS: Record<ShippingZone, Record<number, number>> = {
  metro: {
    0.5: 59,
    1: 79,
    2: 99,
    3: 119,
    4: 139,
    5: 159,
    6: 179,
    7: 199,
    8: 219,
    9: 239,
    10: 259,
  },
  nacional: {
    0.5: 99,
    1: 119,
    2: 139,
    3: 159,
    4: 179,
    5: 199,
    6: 219,
    7: 239,
    8: 259,
    9: 279,
    10: 299,
  },
};

/**
 * Calcula el costo de envío estándar basado en zona y peso
 * @param zone Zona de envío
 * @param kg Peso en kilogramos
 * @returns Costo en MXN
 */
export function quote(zone: ShippingZone, kg: number): {
  standard: number;
  express: number;
} {
  const tariffs = TARIFFS[zone];
  
  // Redondear hacia arriba a la mitad de kg más cercana
  const roundedKg = Math.ceil(kg * 2) / 2;
  
  // Buscar el peso más cercano en la tabla (hasta 10 kg)
  let standardPrice = tariffs[10] || 0;
  
  for (const [weightStr, price] of Object.entries(tariffs)) {
    const weight = parseFloat(weightStr);
    if (roundedKg <= weight) {
      standardPrice = price;
      break;
    }
  }
  
  // Express es aproximadamente 1.8x el estándar
  const expressPrice = Math.round(standardPrice * 1.8);
  
  return {
    standard: standardPrice,
    express: expressPrice,
  };
}

