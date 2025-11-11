import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

/**
 * Cliente público de Supabase sin cookies, creado por request.
 * NO crea cliente en top-level para evitar lecturas de env en build.
 */
export function getPublicSupabase() {
  const { url, anon } = getPublicEnv();
  return createClient(url, anon, { auth: { persistSession: false } });
}

