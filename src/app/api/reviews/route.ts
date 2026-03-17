import { NextResponse } from "next/server";
import { z } from "zod";
import "server-only";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { getPublicSupabase } from "@/lib/supabase/public";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const postBodySchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  author_name: z.string().optional().nullable(),
}).refine((d) => !d.body || d.body.length >= 10, { message: "body min 10 caracteres", path: ["body"] });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("product_id");
  if (!productId) {
    return NextResponse.json({ error: "product_id requerido" }, { status: 400 });
  }
  const uuidSchema = z.string().uuid();
  const parsed = uuidSchema.safeParse(productId);
  if (!parsed.success) {
    return NextResponse.json({ error: "product_id uuid inválido" }, { status: 422 });
  }

  const supabase = getPublicSupabase();
  const { data: rows, error } = await supabase
    .from("product_reviews")
    .select("id, rating, title, body, author_name, is_example, created_at")
    .eq("product_id", parsed.data)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/reviews]", error);
    return NextResponse.json({ error: "Error al cargar reseñas" }, { status: 500 });
  }

  const real = (rows ?? []).filter((r) => !r.is_example);
  const example = (rows ?? []).filter((r) => r.is_example);
  const all = rows ?? [];
  const sum = all.reduce((s, r) => s + r.rating, 0);
  const average_rating = all.length ? Math.round((sum / all.length) * 10) / 10 : 0;

  return NextResponse.json({
    product_id: parsed.data,
    average_rating,
    review_count: all.length,
    real_reviews: real,
    example_reviews: example,
  });
}

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { message: "Inicia sesión para escribir una reseña." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Validación fallida" },
      { status: 422 },
    );
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing, error: antiSpamError } = await supabase
    .from("product_reviews")
    .select("id")
    .eq("product_id", parsed.data.product_id)
    .eq("user_id", user.id)
    .gte("created_at", since)
    .eq("is_example", false)
    .limit(1)
    .maybeSingle();

  if (antiSpamError) {
    console.error("[POST /api/reviews] anti-spam query", antiSpamError);
    return NextResponse.json(
      { message: "No se pudo validar anti-spam. Intenta de nuevo." },
      { status: 500 },
    );
  }

  if (existing) {
    return NextResponse.json(
      { message: "Ya enviaste una reseña para este producto recientemente." },
      { status: 429 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceRoleKey) {
    console.error("[POST /api/reviews] missing service role env");
    return NextResponse.json(
      { message: "No se pudo publicar la reseña. Intenta de nuevo." },
      { status: 500 },
    );
  }

  const ua = req.headers.get("user-agent") ?? null;
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfIp = req.headers.get("cf-connecting-ip");
  const ip =
    (cfIp && cfIp.trim()) ||
    (realIp && realIp.trim()) ||
    (forwardedFor ? forwardedFor.split(",")[0]?.trim() : "") ||
    null;
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const ip_hash_day = ip
    ? createHash("sha256").update(`${ip}|${day}`).digest("hex").slice(0, 32)
    : null;

  // Insert con Service Role (server-only) para permitir auto-publicación sin cambiar RLS.
  // La autenticación sigue siendo por sesión (createServerSupabase + cookies).
  const service = createServiceClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await service.from("product_reviews").insert({
    product_id: parsed.data.product_id,
    rating: parsed.data.rating,
    title: parsed.data.title ?? null,
    body: parsed.data.body ?? null,
    author_name: parsed.data.author_name ?? null,
    user_id: user.id,
    is_example: false,
    is_published: true,
    source: "user",
    meta: {
      ip_hash_day,
      ua,
    },
  });

  if (error) {
    console.error("[POST /api/reviews]", error);
    return NextResponse.json({ error: "Error al guardar reseña" }, { status: 500 });
  }

  return NextResponse.json({ message: "Gracias, tu reseña fue publicada." }, { status: 200 });
}
