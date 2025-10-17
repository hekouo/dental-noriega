import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
// import type { Database } from "@/lib/supabase/database.types"; // si generaste tipos

export function createActionSupabase() {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Faltan variables de Supabase");

  return createServerClient(/*<Database>*/ url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });
}
