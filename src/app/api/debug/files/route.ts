// src/app/api/debug/files/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { listCsvFiles } from "@/lib/utils/files";

export async function GET() {
  try {
    const files = await listCsvFiles();
    return NextResponse.json({ 
      success: true,
      count: files.length,
      files: files.map(f => `/data/${f}`),
      message: "Archivos CSV encontrados. Prueba abrir cada URL en el navegador para verificar que sean accesibles."
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

