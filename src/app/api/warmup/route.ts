import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function GET() {
  revalidateTag("featured");
  revalidateTag("catalog");
  return NextResponse.json({
    ok: true,
    revalidated: ["featured", "catalog"],
    at: new Date().toISOString(),
  });
}
