// src/lib/utils/supabase-env.ts
/**
 * Verifica si las variables de entorno de Supabase están presentes
 */
export function hasSupabaseEnvs(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

