import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Verificar que las variables de entorno estén configuradas
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    );

    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Missing environment variables: ${missingVars.join(", ")}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
