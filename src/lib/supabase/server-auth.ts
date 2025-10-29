import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, opts: any) => {
          cookieStore.set({ name, value, ...opts });
        },
        remove: (name: string, opts: any) => {
          cookieStore.set({ name, value: "", ...opts });
        },
      },
    },
  );
}
