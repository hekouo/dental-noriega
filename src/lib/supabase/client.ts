"use client";
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export function getBrowserSupabase() {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key, {
    cookies: {
      get: () => document.cookie,
      set: () => {},
      remove: () => {},
    },
  });
}

/**
 * Cliente público de Supabase para uso en servidor (sin cookies/auth)
 * No truena en build si faltan envs, solo avisa en runtime
 */
export function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // No truenes en build. Solo avisa en runtime.
    if (process.env.NEXT_RUNTIME) {
      console.warn("[supabase] missing NEXT_PUBLIC_SUPABASE_* envs");
    }
    // devuelve un client fake que nunca se usa si no lo llamas.
    return null as any;
  }
  return createClient(url, anon, { auth: { persistSession: false } });
}
