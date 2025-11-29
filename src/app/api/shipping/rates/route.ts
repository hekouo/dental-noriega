import { NextRequest, NextResponse } from "next/server";
import { getSkydropxRates } from "@/lib/shipping/skydropx.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type UiShippingOption = {
  code: string; // p.ej. "skydropx_standard"
  label: string; // p.ej. "Envío a domicilio (2-4 días)"
  priceCents: number;
  provider: "skydropx";
  etaMinDays: number | null;
  etaMaxDays: number | null;
  externalRateId: string; // el rate id original
};

type RatesRequest = {
  address: {
    postalCode: string;
    state: string;
    city: string;
    country?: string;
  };
  totalWeightGrams?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as RatesRequest | null;

    if (!body || !body.address) {
      return NextResponse.json(
        { error: "Se requiere address con postalCode, state y city" },
        { status: 400 },
      );
    }

    const { address, totalWeightGrams } = body;

    if (!address.postalCode || !address.state) {
      return NextResponse.json(
        { error: "address.postalCode y address.state son requeridos" },
        { status: 400 },
      );
    }

    // Usar peso total del carrito o fallback razonable (1000g = 1kg)
    // Documentado: si no viene totalWeightGrams, usamos 1kg como default
    const weightGrams = totalWeightGrams || 1000;

    const rates = await getSkydropxRates(
      {
        postalCode: address.postalCode,
        state: address.state,
        city: address.city || "",
        country: address.country || "MX",
      },
      {
        weightGrams,
        // Dimensiones por defecto: 20x20x10 cm (ya manejadas en getSkydropxRates)
      },
    );

    // Mapear tarifas a formato UI
    const options: UiShippingOption[] = rates
      .map((rate, index) => {
        // Generar código único basado en provider y service
        const code = `skydropx_${rate.provider}_${index}`;
        
        // Generar label descriptivo
        const etaText =
          rate.etaMinDays && rate.etaMaxDays
            ? ` (${rate.etaMinDays}-${rate.etaMaxDays} días)`
            : rate.etaMinDays
              ? ` (${rate.etaMinDays}+ días)`
              : "";
        const label = `${rate.service}${etaText}`;

        return {
          code,
          label,
          priceCents: rate.totalPriceCents,
          provider: "skydropx" as const,
          etaMinDays: rate.etaMinDays,
          etaMaxDays: rate.etaMaxDays,
          externalRateId: rate.externalRateId,
        };
      })
      .sort((a, b) => a.priceCents - b.priceCents); // Ordenar por precio ASC

    return NextResponse.json({ options });
  } catch (error) {
    console.error("[shipping/rates] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener tarifas de envío" },
      { status: 500 },
    );
  }
}

