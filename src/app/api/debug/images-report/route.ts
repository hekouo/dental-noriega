export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { listCatalog } from "@/lib/supabase/catalog";
import { tryParseUrl, isAllowedImageHost } from "@/lib/utils/url";
import { allowDebug } from "../_guard";

export async function GET() {
  if (!allowDebug) return new Response("debug off", { status: 404 });
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

      const u = tryParseUrl(product.image_url);
      if (!u) {
        imageAnalysis.brokenUrls.push(product.image_url);
        return;
      }
      const hostname = u.hostname;

      // Contar dominios
      imageAnalysis.domains[hostname] =
        (imageAnalysis.domains[hostname] || 0) + 1;

      // Contar tipos de URLs por hostname exacto
      if (hostname === "lh3.googleusercontent.com") {
        imageAnalysis.lh3Urls++;
      } else if (hostname === "drive.google.com") {
        imageAnalysis.driveUrls++;
      } else {
        imageAnalysis.otherUrls++;
      }
    });

    return NextResponse.json({
      success: true,
      analysis: imageAnalysis,
      allowlist: {
        allowedHostnamesExample: Array.from(
          new Set(
            Object.keys(imageAnalysis.domains).filter((h) =>
              isAllowedImageHost(h),
            ),
          ),
        ),
      },
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
