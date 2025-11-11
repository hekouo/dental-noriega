import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente público de Supabase sin cookies, para uso en server components
 * y dentro de unstable_cache sin problemas.
 */
export function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // No truenes en build. Solo avisa en runtime.
    if (process.env.NEXT_RUNTIME) {
      console.warn("[supabase] missing NEXT_PUBLIC_SUPABASE_* envs");
    }
    // Devuelve un client fake que nunca se usa si no lo llamas.
    // En runtime, esto causará errores si se intenta usar, pero no rompe el build.
    return null as any;
  }

  return createClient(url, anon, { auth: { persistSession: false } });
}

