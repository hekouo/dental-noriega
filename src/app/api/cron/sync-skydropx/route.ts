import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncSkydropxTracking } from "../../../../../scripts/sync-skydropx-tracking";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function extractProvidedSecret(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  const direct = headers.get("x-cron-secret");
  if (!direct) {
    return null;
  }
  if (direct.toLowerCase().startsWith("bearer ")) {
    return direct.slice(7).trim();
  }
  return direct.trim() || null;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

function isAuthorized(provided: string | null, expected: string | undefined): boolean {
  // En dev, si no hay secret configurado, permitir pero loguear
  if (!expected) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[cron/sync-skydropx] CRON_SECRET no configurado, permitiendo en dev");
      return true;
    }
    return false;
  }
  if (!provided) {
    return false;
  }
  return safeEqual(provided, expected);
}

/**
 * Endpoint de cron para sincronizar tracking de Skydropx
 * 
 * Protegido con CRON_SECRET para evitar llamadas no autorizadas.
 * Vercel Cron automáticamente agrega el header Authorization: Bearer <CRON_SECRET>.
 * También acepta x-cron-secret como fallback.
 * 
 * Para llamadas manuales, incluir header: Authorization: Bearer <CRON_SECRET>
 * o x-cron-secret: <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET;

    // En producción, CRON_SECRET es obligatorio
    if (process.env.NODE_ENV === "production" && !expected) {
      console.error("[cron/sync-skydropx] CRON_SECRET no configurado en producción");
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 },
      );
    }

    const provided = extractProvidedSecret(req.headers);
    if (!isAuthorized(provided, expected)) {
      console.error("[cron/sync-skydropx] CRON_SECRET inválido o faltante");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log("[cron/sync-skydropx] Iniciando sincronización de tracking Skydropx...");

    // Ejecutar el script de sincronización
    await syncSkydropxTracking();

    console.log("[cron/sync-skydropx] Sincronización completada");

    return NextResponse.json({
      ok: true,
      message: "Sync completed",
    });
  } catch (error) {
    console.error("[cron/sync-skydropx] Error inesperado:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

