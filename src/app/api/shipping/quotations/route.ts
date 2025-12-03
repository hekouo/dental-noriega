import { NextRequest, NextResponse } from "next/server";
import { createQuotation, type SkydropxQuotationPayload } from "@/lib/skydropx/client";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Schema de validación para el request
const QuotationRequestSchema = z.object({
  address_from: z.object({
    province: z.string().min(1),
    city: z.string().min(1),
    country: z.string().default("MX"),
    zip: z.string().min(1),
    name: z.string().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
  }),
  address_to: z.object({
    province: z.string().min(1),
    city: z.string().min(1),
    country: z.string().default("MX"),
    zip: z.string().min(1),
    name: z.string().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
  }),
  parcels: z.array(
    z.object({
      weight: z.number().positive(),
      distance_unit: z.literal("CM"),
      mass_unit: z.literal("KG"),
      height: z.number().positive(),
      width: z.number().positive(),
      length: z.number().positive(),
    }),
  ).min(1),
});

type QuotationResponse =
  | {
      ok: true;
      rates: Array<{
        id: string;
        provider_display_name: string;
        provider_service_name: string;
        days: number | null;
        total: number;
        currency_code: string;
        pickup: boolean;
        pickup_automatic: boolean;
      }>;
    }
  | {
      ok: false;
      error: string;
    };

export async function POST(req: NextRequest) {
  try {
    // Verificar feature flag
    const enableSkydropx = process.env.ENABLE_SKYDROPX_SHIPPING !== "false";
    if (!enableSkydropx) {
      return NextResponse.json(
        {
          ok: false,
          error: "Skydropx shipping está deshabilitado",
        } satisfies QuotationResponse,
        { status: 200 },
      );
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          ok: false,
          error: "Datos inválidos: se espera un objeto JSON",
        } satisfies QuotationResponse,
        { status: 200 },
      );
    }

    // Validar con Zod
    const validationResult = QuotationRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        {
          ok: false,
          error: `Datos inválidos: ${errors}`,
        } satisfies QuotationResponse,
        { status: 200 },
      );
    }

    const payload = validationResult.data as SkydropxQuotationPayload;

    if (process.env.NODE_ENV !== "production") {
      console.log("[shipping/quotations] Request recibida:", {
        from: payload.address_from.zip,
        to: payload.address_to.zip,
        parcels: payload.parcels.length,
      });
    }

    // Llamar a Skydropx
    const result = await createQuotation(payload);

    // Si el resultado indica error, devolver error controlado
    if (!result.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[shipping/quotations] Error de Skydropx:", {
          code: result.code,
          message: result.message,
        });
      }
      return NextResponse.json(
        {
          ok: false,
          error: result.message,
        } satisfies QuotationResponse,
        { status: 200 },
      );
    }

    // Parsear respuesta exitosa
    const response = result.data;
    let ratesArray: Array<{
      id: string;
      provider_display_name?: string;
      provider_service_name?: string;
      days?: number;
      total?: number;
      currency_code?: string;
      pickup?: boolean;
      pickup_automatic?: boolean;
    }> = [];

    if (Array.isArray(response)) {
      ratesArray = response;
    } else if (response?.data && Array.isArray(response.data)) {
      ratesArray = response.data;
    } else if (response?.included && Array.isArray(response.included)) {
      ratesArray = response.included;
    }

    // Mapear a formato limpio
    const cleanRates = ratesArray
      .map((rate) => ({
        id: rate.id || "",
        provider_display_name: rate.provider_display_name || "Unknown",
        provider_service_name: rate.provider_service_name || "Standard",
        days: rate.days ?? null,
        total: rate.total ?? 0,
        currency_code: rate.currency_code || "MXN",
        pickup: rate.pickup ?? false,
        pickup_automatic: rate.pickup_automatic ?? false,
      }))
      .filter((rate) => rate.id && rate.total > 0)
      .sort((a, b) => a.total - b.total); // Ordenar por precio ASC

    if (process.env.NODE_ENV !== "production") {
      console.log("[shipping/quotations] Tarifas obtenidas:", cleanRates.length);
    }

    return NextResponse.json({
      ok: true,
      rates: cleanRates,
    } satisfies QuotationResponse);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[shipping/quotations] Error inesperado:", error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      } satisfies QuotationResponse,
      { status: 200 },
    );
  }
}

