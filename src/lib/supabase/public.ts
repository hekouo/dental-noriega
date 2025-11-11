import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente público de Supabase por request, sin cookies ni singleton global.
 * NO crea cliente en top-level para evitar lecturas de env en build.
 */
export function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // No leer cookies, no singleton global
  return createSupabaseClient(url, anon, { auth: { persistSession: false } });
}

/**
 * Alias para getPublicSupabase para mantener compatibilidad
 */
export function createClient() {
  return getPublicSupabase();
}
