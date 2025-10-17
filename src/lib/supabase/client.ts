// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
// Si generaste tipos de tu DB con supabase, ajusta la ruta:
// import type { Database } from "./types";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anon) {
    // Grita en desarrollo si faltan variables
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  // Si no tienes tipos, quita <Database>
  return createBrowserClient(/*<Database>*/ url, anon);
}
