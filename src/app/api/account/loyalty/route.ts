import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getLoyaltySummaryByEmail } from "@/lib/loyalty/points.server";
import {
  LOYALTY_MIN_POINTS_FOR_DISCOUNT,
  LOYALTY_DISCOUNT_PERCENT,
} from "@/lib/loyalty/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  noStore();
  try {
    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email requerido" },
        { status: 400 },
      );
    }

    const summary = await getLoyaltySummaryByEmail(email);

    if (!summary) {
      return NextResponse.json(
        { error: "No se pudo obtener información de puntos" },
        { status: 500 },
      );
    }

    const canApplyDiscount = summary.pointsBalance >= LOYALTY_MIN_POINTS_FOR_DISCOUNT;

    return NextResponse.json({
      pointsBalance: summary.pointsBalance,
      lifetimeEarned: summary.lifetimeEarned,
      canApplyDiscount,
      pointsRequired: LOYALTY_MIN_POINTS_FOR_DISCOUNT,
      discountPercent: LOYALTY_DISCOUNT_PERCENT,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[GET /api/account/loyalty]", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}

