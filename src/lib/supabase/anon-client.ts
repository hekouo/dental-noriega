import { createClient } from "@supabase/supabase-js";

export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Si falta env en build (preview PR) o no hay window, retornar null para evitar crash
  if (!url || !anon || process.env.NEXT_PHASE === "phase-production-build" || typeof window === "undefined") {
    return null;
  }
  return createClient(url, anon);
}
