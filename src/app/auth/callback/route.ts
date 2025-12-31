import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/cuenta";

  if (!code) {
    console.warn("[auth/callback] No code provided");
    return NextResponse.redirect(
      new URL("/cuenta?error=missing_code", requestUrl.origin),
    );
  }

  try {
    // Usar createServerSupabase que maneja cookies correctamente
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] Error exchanging code:", {
        error: error.message,
        type,
        hasCode: !!code,
      });
      return NextResponse.redirect(
        new URL(`/cuenta?error=auth&message=${encodeURIComponent(error.message)}`, requestUrl.origin),
      );
    }

    // Si es un signup (verificación de email) o magiclink, redirigir a cuenta con mensaje de verificación
    if (type === "signup" || type === "magiclink") {
      return NextResponse.redirect(
        new URL("/cuenta?verified=1", requestUrl.origin),
      );
    }

    // Si es recovery (reset password), redirigir a reset-password (o next si viene)
    if (type === "recovery") {
      const redirectPath = next.startsWith("/") ? next : `/reset-password`;
      return NextResponse.redirect(
        new URL(redirectPath, requestUrl.origin),
      );
    }

    // Para otros tipos, usar next o redirigir a cuenta
    const redirectPath = next.startsWith("/") ? next : "/cuenta";
    return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", {
      error: err instanceof Error ? err.message : String(err),
      type,
    });
    return NextResponse.redirect(
      new URL("/cuenta?error=unexpected", requestUrl.origin),
    );
  }
}

