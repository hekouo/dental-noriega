// src/app/api/debug/domains/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getAll } from "@/lib/data/catalog-index.server";

export async function GET() {
  try {
    const products = getAll();
    const domains = new Set<string>();

    for (const product of products) {
      if (product.imageUrl) {
        try {
          const url = new URL(product.imageUrl);
          domains.add(url.hostname);
        } catch {
          // Invalid URL, skip
        }
      }
    }

    return NextResponse.json({
      success: true,
      domains: Array.from(domains).sort(),
      totalDomains: domains.size,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
