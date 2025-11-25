import { NextRequest, NextResponse } from "next/server";
import { createActionSupabase } from "@/lib/supabase/server-actions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");

  if (code) {
    const supabase = createActionSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] Error exchanging code:", error);
      return NextResponse.redirect(
        new URL("/cuenta?error=auth", requestUrl.origin),
      );
    }

    // Si es un signup (verificación de email) o magiclink, redirigir a cuenta con mensaje de verificación
    if (type === "signup" || type === "magiclink") {
      return NextResponse.redirect(
        new URL("/cuenta?verified=1", requestUrl.origin),
      );
    }

    // Para otros tipos (recovery, etc.), redirigir a cuenta
    return NextResponse.redirect(new URL("/cuenta", requestUrl.origin));
  }

  // Si no hay código, redirigir a cuenta
  return NextResponse.redirect(new URL("/cuenta", requestUrl.origin));
}

