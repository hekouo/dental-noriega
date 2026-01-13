import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /auth/confirm
 * 
 * Verifica el token_hash usando verifyOtp (patrón recomendado de Supabase).
 * Protegido contra link scanners: solo consume el token cuando el usuario hace POST.
 * 
 * El email link apunta a /auth/confirm?token_hash=...&type=recovery&next=/reset-password
 * pero la page.tsx muestra un botón "Continuar" que hace POST aquí.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const tokenHash = formData.get("token_hash") as string | null;
    const type = formData.get("type") as string | null;
    const nextParam = formData.get("next") as string | null;

    if (!tokenHash) {
      return NextResponse.redirect(
        new URL("/auth/error?error=missing_token", request.nextUrl.origin),
      );
    }

    const supabase = await createServerSupabase();

    // verifyOtp con token_hash (patrón recomendado de Supabase)
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (type as "recovery" | "email" | "magiclink" | "signup") || "recovery",
    });

    if (error) {
      console.error("[auth/confirm] Error verifying OTP:", {
        error: error.message,
        type,
        hasTokenHash: !!tokenHash,
      });
      return NextResponse.redirect(
        new URL(
          `/auth/error?error=${encodeURIComponent(error.message)}`,
          request.nextUrl.origin,
        ),
      );
    }

    // Determinar next path (sanitizar)
    let nextPath = "/reset-password";
    if (nextParam && nextParam.startsWith("/")) {
      nextPath = nextParam;
    } else if (type === "signup" || type === "magiclink") {
      nextPath = "/cuenta?verified=1";
    }
    // Si type === "recovery" o no hay nextParam, nextPath ya es "/reset-password"

    // Éxito: redirigir con sesión válida
    return NextResponse.redirect(new URL(nextPath, request.nextUrl.origin));
  } catch (err) {
    console.error("[auth/confirm] Unexpected error:", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(
      new URL("/auth/error?error=unexpected", request.nextUrl.origin),
    );
  }
}

