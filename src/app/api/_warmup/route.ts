import { NextResponse } from "next/server";
import { getCatalogIndex } from "@/lib/data/catalog-index.server";

export async function GET() {
  // Solo en desarrollo
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  try {
    // Cargar el índice a memoria
    const index = await getCatalogIndex();
    
    // Verificar que se cargó correctamente
    const stats = {
      sections: index.bySection.size,
      totalProducts: Array.from(index.bySection.values()).reduce((sum, sectionMap) => sum + sectionMap.size, 0),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({ 
      success: true, 
      message: "Catalog index warmed up successfully",
      stats 
    });
  } catch (error) {
    console.error("[Warmup] Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
