/**
 * middleware.disabled.ts — stub inofensivo para que TypeScript no rompa.
 * No importa que exista: al no llamarse "middleware.ts" Next no lo ejecuta.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

// Evita que TS lo trate como script global
export const config = {};
