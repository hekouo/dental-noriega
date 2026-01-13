import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware para refrescar sesión de Supabase y manejar cookies de forma segura.
 * 
 * Este middleware:
 * - Refresca la sesión de Supabase si hay cookies válidas
 * - Actualiza cookies de sesión si es necesario
 * - Maneja errores de refresh_token_not_found gracefully (limpia cookies inválidas)
 * - NO bloquea el request si falla el refresh
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Si no hay configuración, continuar sin refresh
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Actualizar cookies en la request y response
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        // Remover cookies de la request y response
        request.cookies.set({
          name,
          value: "",
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });

  // Intentar refrescar la sesión
  // Si hay un refresh_token inválido, Supabase intentará limpiarlo
  // y esto actualizará las cookies correctamente en el middleware
  try {
    await supabase.auth.getUser();
  } catch (error) {
    // Si hay un error (ej: refresh_token_not_found), no bloquear el request
    // Las cookies inválidas ya fueron limpiadas por Supabase si era necesario
    console.warn("[middleware] Error al refrescar sesión:", error instanceof Error ? error.message : String(error));
    // Continuar con el request sin bloquear
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
