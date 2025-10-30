import { NextResponse } from "next/server";
import { listBySection } from "@/lib/supabase/catalog";
import { tryParseUrl, appendSizeParamForLh } from "@/lib/utils/url";
import { normalizeImageUrl } from "@/lib/utils/images";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listBySection("equipos");
    const results = [];

    // Tomar solo los primeros 20 productos para no sobrecargar
    const sample = (items ?? []).slice(0, 20);

    for (const item of sample) {
      const normalized = normalizeImageUrl(item.image_url);
      if (!normalized) {
        results.push({
          id: item.id,
          title: item.title,
          original: item.image_url,
          normalized: null,
          status: "no-url",
          finalUrl: null,
          withSize: null,
          withSizeStatus: null,
        });
        continue;
      }

      const originalUrl = tryParseUrl(normalized);
      if (!originalUrl) {
        results.push({
          id: item.id,
          title: item.title,
          original: item.image_url,
          normalized,
          status: "invalid",
          finalUrl: null,
          withSize: null,
          withSizeStatus: null,
        });
        continue;
      }

      // Probar URL original
      let originalStatus = "error";
      let finalUrl = null;
      try {
        const response = await fetch(originalUrl.toString(), {
          method: "HEAD",
        });
        originalStatus = response.status.toString();
        finalUrl = response.url;
      } catch {
        originalStatus = "error";
      }

      // Si es lh3 sin tamaño y falló, probar con =s800
      let withSize = null;
      let withSizeStatus = null;
      if (
        originalUrl.hostname.includes("googleusercontent.com") &&
        !originalUrl.pathname.includes("=s") &&
        !originalUrl.pathname.includes("=w") &&
        (originalStatus === "403" || originalStatus === "404")
      ) {
        const sizedUrl = appendSizeParamForLh(originalUrl, 800);
        withSize = sizedUrl.toString();

        try {
          const sizedResponse = await fetch(sizedUrl.toString(), {
            method: "HEAD",
          });
          withSizeStatus = sizedResponse.status.toString();
        } catch {
          withSizeStatus = "error";
        }
      }

      results.push({
        id: item.id,
        title: item.title,
        original: item.image_url,
        normalized,
        status: originalStatus,
        finalUrl,
        withSize,
        withSizeStatus,
      });
    }

    return NextResponse.json({
      total: sample.length,
      results,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
