import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server route para casos de OAuth/server-side con code en query params
 * 
 * NOTA: En Next.js App Router, si existe page.tsx, tiene prioridad sobre route.ts para GET.
 * Este route se mantiene para:
 * - Compatibilidad con flujos OAuth que requieren procesamiento server-side
 * - Casos donde se necesita manejar cookies específicamente en el servidor
 * 
 * Para recovery (reset password), Supabase puede enviar tokens en hash (#access_token...)
 * que no son accesibles desde el servidor. En esos casos, el Client Component
 * en page.tsx maneja el flujo completo.
 */
export async function GET(request: NextRequest) {
  // Si existe page.tsx, este route no se ejecutará para GET requests
  // Se mantiene para compatibilidad y casos específicos de OAuth server-side
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/cuenta";

  if (!code) {
    console.warn("[auth/callback/route] No code provided, redirecting to page.tsx");
    // Si no hay code, dejar que page.tsx maneje (puede tener hash)
    return NextResponse.next();
  }

  try {
    // Usar createServerSupabase que maneja cookies correctamente
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback/route] Error exchanging code:", {
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
    console.error("[auth/callback/route] Unexpected error:", {
      error: err instanceof Error ? err.message : String(err),
      type,
    });
    return NextResponse.redirect(
      new URL("/cuenta?error=unexpected", requestUrl.origin),
    );
  }
}

