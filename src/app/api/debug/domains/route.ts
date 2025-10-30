export const dynamic = "force-dynamic";

export async function GET() {
  // DEBUG deshabilitado por defecto en este endpoint
  return new Response("debug off", { status: 404 });
}
