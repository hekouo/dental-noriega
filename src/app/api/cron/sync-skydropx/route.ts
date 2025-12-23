import { NextRequest, NextResponse } from "next/server";
import { syncSkydropxTracking } from "../../../../../scripts/sync-skydropx-tracking";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Valida el secret del cron
 */
function validateCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Si no hay secret configurado, permitir en desarrollo pero loguear warning
    if (process.env.NODE_ENV === "development") {
      console.warn("[cron/sync-skydropx] CRON_SECRET no configurado, permitiendo en dev");
      return true;
    }
    return false;
  }

  // Verificar header x-cron-secret (Vercel Cron lo agrega automáticamente)
  const providedSecret = request.headers.get("x-cron-secret");
  if (!providedSecret) {
    return false;
  }

  return providedSecret === secret;
}

/**
 * Endpoint de cron para sincronizar tracking de Skydropx
 * 
 * Protegido con CRON_SECRET para evitar llamadas no autorizadas.
 * Vercel Cron automáticamente agrega el header x-cron-secret.
 * 
 * Para llamadas manuales, incluir header: x-cron-secret: <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  try {
    // Validar secret del cron
    if (!validateCronSecret(req)) {
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

