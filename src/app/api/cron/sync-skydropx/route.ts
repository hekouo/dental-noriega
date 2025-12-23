import { NextRequest, NextResponse } from "next/server";
// Importar desde la raíz del proyecto (scripts está fuera de src)
import { syncSkydropxTracking } from "../../../../../scripts/sync-skydropx-tracking";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Valida el secret del cron job
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

  // Verificar header x-cron-secret
  const providedSecret = request.headers.get("x-cron-secret");
  if (!providedSecret) {
    return false;
  }

  return providedSecret === secret;
}

/**
 * Endpoint para sincronizar tracking de Skydropx
 * 
 * Protegido con CRON_SECRET (header x-cron-secret)
 * 
 * Uso:
 * - Vercel Cron: configurar en vercel.json
 * - Manual: curl -H "x-cron-secret: tu_secret" https://tu-dominio.com/api/cron/sync-skydropx
 */
export async function GET(req: NextRequest) {
  try {
    // Validar secret del cron
    if (!validateCronSecret(req)) {
      console.error("[cron/sync-skydropx] Cron secret inválido o faltante");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log("[cron/sync-skydropx] Iniciando sincronización de tracking Skydropx...");

    // Ejecutar sincronización
    await syncSkydropxTracking();

    return NextResponse.json({
      ok: true,
      message: "Sincronización completada",
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

