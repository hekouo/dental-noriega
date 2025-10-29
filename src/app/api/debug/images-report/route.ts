export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { listCatalog } from "@/lib/supabase/catalog";

export async function GET() {
  try {
    const products = await listCatalog();

    // Analizar URLs de imágenes
    const imageAnalysis = {
      total: products.length,
      withImages: products.filter((p) => p.image_url).length,
      withoutImages: products.filter((p) => !p.image_url).length,
      domains: {} as Record<string, number>,
      brokenUrls: [] as string[],
      lh3Urls: 0,
      driveUrls: 0,
      otherUrls: 0,
    };

    // Contar dominios y tipos de URLs
    products.forEach((product) => {
      if (!product.image_url) return;

      try {
        const url = new URL(product.image_url);
        const hostname = url.hostname;

        // Contar dominios
        imageAnalysis.domains[hostname] =
          (imageAnalysis.domains[hostname] || 0) + 1;

        // Contar tipos de URLs
        if (hostname.includes("lh3.googleusercontent.com")) {
          imageAnalysis.lh3Urls++;
        } else if (hostname.includes("drive.google.com")) {
          imageAnalysis.driveUrls++;
        } else {
          imageAnalysis.otherUrls++;
        }
      } catch (error) {
        // URL malformada
        imageAnalysis.brokenUrls.push(product.image_url);
      }
    });

    return NextResponse.json({
      success: true,
      analysis: imageAnalysis,
      recommendations: [
        imageAnalysis.driveUrls > 0
          ? `Convertir ${imageAnalysis.driveUrls} URLs de Drive a lh3`
          : null,
        imageAnalysis.withoutImages > 0
          ? `${imageAnalysis.withoutImages} productos sin imagen`
          : null,
        imageAnalysis.brokenUrls.length > 0
          ? `${imageAnalysis.brokenUrls.length} URLs malformadas`
          : null,
      ].filter(Boolean),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
