export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

export async function GET() {
  return json(
    { status: "disabled", hint: "Fase 1: Stripe webhook deshabilitado" },
    501,
  );
}

export async function POST() {
  return json({ error: "Stripe webhook deshabilitado en Fase 1." }, 501);
}
