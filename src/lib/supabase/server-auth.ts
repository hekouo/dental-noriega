import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { AuthApiError } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para Server Components (read-only).
 * 
 * IMPORTANTE: Este helper NO debe mutar cookies durante SSR.
 * Las cookies se refrescan en el middleware antes de que llegue al Server Component.
 * 
 * Si hay un error de refresh_token_not_found, retorna "unauthenticated" sin lanzar error.
 */
export async function createServerSupabase() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan variables de Supabase");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      // NO mutar cookies en Server Components
      // El middleware ya refrescó la sesión antes de llegar aquí
      set: () => {
        // No-op: cookies se manejan en middleware
      },
      remove: () => {
        // No-op: cookies se manejan en middleware
      },
    },
  });

  return supabase;
}

/**
 * Helper para obtener el usuario de forma segura en Server Components.
 * Maneja errores de refresh_token_not_found gracefully.
 */
export async function getServerUser() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Si hay un error de refresh_token_not_found, retornar null (unauthenticated)
    if (error) {
      const authError = error as AuthApiError;
      if (
        authError.message?.includes("refresh_token_not_found") ||
        authError.message?.includes("Invalid Refresh Token") ||
        authError.status === 401
      ) {
        // Token inválido: retornar null sin lanzar error
        return null;
      }
      // Otros errores: log y retornar null
      console.warn("[getServerUser] Error al obtener usuario:", error.message);
      return null;
    }

    return user;
  } catch (error) {
    // Cualquier error inesperado: retornar null sin bloquear
    console.warn("[getServerUser] Error inesperado:", error instanceof Error ? error.message : String(error));
    return null;
  }
}
