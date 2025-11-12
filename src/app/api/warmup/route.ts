import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // no hacemos revalidateTag; solo devolvemos marca temporal para confirmar
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
