// src/lib/utils/files.ts
export async function listCsvFiles() {
  const path = await import("path");
  const { promises: fs } = await import("fs");
  const dir = path.join(process.cwd(), "public", "data");
  
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch (err) {
    throw new Error(`No existe la carpeta ${dir}. Error: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  const csvs = files.filter(f => /\.csv$/i.test(f));
  
  if (!csvs.length) {
    throw new Error(`No se encontraron CSV en /public/data. Encontrados: ${files.join(", ") || "(vacío)"}`);
  }
  
  return csvs.sort();
}

