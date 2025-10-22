import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
// import type { Database } from "@/lib/supabase/database.types";

export function createServerSupabase() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Faltan variables de Supabase");

  return createServerClient(/*<Database>*/ url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}
