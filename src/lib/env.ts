export function getPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return {
    url,
    anon,
    ok: Boolean(url && anon),
    nodeEnv: process.env.NODE_ENV || "development",
  };
}

