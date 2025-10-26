import "server-only";
import { readFileSync } from "fs";
import { join } from "path";
import { normalizeSlug } from "@/lib/utils/slug";
import { driveToLh3 } from "@/lib/utils/images";

export type ProductLite = {
  id: string;
  section: string;
  slug: string;
  title: string;
  price: number;
  imageUrl?: string;
  inStock?: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __catalog: ProductLite[] | undefined;
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });
}

function loadCatalogFromCSV(): ProductLite[] {
  if (globalThis.__catalog) {
    return globalThis.__catalog;
  }

  const csvFiles = [
    'catalogo_section_consumibles_y_profilaxis.csv',
    'catalogo_section_equipos.csv',
    'catalogo_section_instrumental_clinico.csv',
    'catalogo_section_instrumental_ortodoncia.csv',
    'catalogo_section_ortodoncia_accesorios_y_retenedores.csv',
    'catalogo_section_ortodoncia_arcos_y_resortes.csv',
    'catalogo_section_ortodoncia_brackets_y_tubos.csv'
  ];

  const products: ProductLite[] = [];
  let idCounter = 1;

  for (const csvFile of csvFiles) {
    try {
      const csvPath = join(process.cwd(), 'public', 'data', csvFile);
      const content = readFileSync(csvPath, 'utf-8');
      const rows = parseCSV(content);
      
      for (const row of rows) {
        if (!row.Title || !row.Price) continue;
        
        const section = normalizeSlug(row.Section || csvFile.replace('.csv', ''));
        const slug = normalizeSlug(row.Title);
        const title = row.Title;
        const price = Math.round(parseFloat(row.Price) * 100); // Convertir a centavos
        const imageUrl = row.Image ? driveToLh3(row.Image) : undefined;
        
        products.push({
          id: String(idCounter++),
          section,
          slug,
          title,
          price,
          imageUrl,
          inStock: true
        });
      }
    } catch (error) {
      console.warn(`Error loading ${csvFile}:`, error);
    }
  }

  globalThis.__catalog = products;
  return products;
}

export { loadCatalogFromCSV };
