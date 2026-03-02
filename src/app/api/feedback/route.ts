import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicSupabase } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

const THROTTLE_WINDOW_MS = 10 * 60 * 1000;
const THROTTLE_MAX = 3;
const throttleMap = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

function throttle(ip: string): boolean {
  const now = Date.now();
  let times = throttleMap.get(ip) ?? [];
  times = times.filter((t) => now - t < THROTTLE_WINDOW_MS);
  if (times.length >= THROTTLE_MAX) return false;
  times.push(now);
  throttleMap.set(ip, times);
  return true;
}

const bodySchema = z.object({
  type: z.enum(["bug", "idea", "opinion", "other"]),
  message: z.string().min(10, "message min 10 caracteres"),
  rating: z.number().int().min(1).max(5).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  page_path: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!throttle(ip)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Validación fallida" },
      { status: 422 },
    );
  }

  const pagePath = parsed.data.page_path ?? (() => {
    try {
      const ref = req.headers.get("referer");
      return ref ? new URL(ref).pathname : null;
    } catch {
      return null;
    }
  })();

  const supabase = getPublicSupabase();
  const { error } = await supabase.from("site_feedback").insert({
    type: parsed.data.type,
    message: parsed.data.message,
    rating: parsed.data.rating ?? null,
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null,
    page_path: pagePath,
    status: "new",
    meta: {
      ip,
      user_agent: req.headers.get("user-agent") ?? null,
    },
  });

  if (error) {
    console.error("[POST /api/feedback]", error);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" }, { status: 201 });
}
