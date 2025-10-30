import { createClient } from "@supabase/supabase-js";

export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Durante el build estático de Next (Vercel Preview/Prod), evita crear el cliente
  // para que no truene el build si faltan envs. Los consumidores deben tolerar null.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null as unknown as ReturnType<typeof createClient>;
  }

  if (!url || !anon) {
    throw new Error(
      "Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel (Preview/Prod).",
    );
  }

  return createClient(url, anon);
}
