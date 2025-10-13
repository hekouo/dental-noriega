// src/lib/utils/csv.ts

function stripBOM(s: string) {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

// autodetecta , o ; y maneja comillas
function parseCSV(text: string) {
  const clean = stripBOM(text).replace(/\r/g, "");
  const lines = clean.split("\n").filter(Boolean);
  if (!lines.length) return [];
  
  // Detectar delimitador: si hay ; y no hay ,, usar ;
  const delim = /;/.test(lines[0]) && !/,/.test(lines[0]) ? ";" : ",";

  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === delim && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map(s => s.trim());
  };

  const headers = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(l => {
    const cols = parseLine(l);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

/** Lee CSV desde /public tanto en cliente como en servidor */
export async function readCSV(filePath: string) {
  const rel = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  
  // En el cliente, usar fetch
  if (typeof window !== "undefined") {
    const res = await fetch("/" + rel, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`No se pudo leer ${filePath}: ${res.status}`);
    }
    return parseCSV(await res.text());
  }
  
  // En el servidor, leer del filesystem
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const abs = path.join(process.cwd(), "public", rel);
  
  try {
    const text = await fs.readFile(abs, "utf8");
    return parseCSV(text);
  } catch (error) {
    throw new Error(`No se pudo leer ${abs}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
