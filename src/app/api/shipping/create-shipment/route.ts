import { NextRequest, NextResponse } from "next/server";
import { createShipment, type SkydropxShipmentPayload } from "@/lib/skydropx/client";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Schema de validación para el request
const CreateShipmentRequestSchema = z.object({
  rate_id: z.string().min(1),
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
  products: z
    .array(
      z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        price: z.number().nonnegative().optional(),
        quantity: z.number().int().positive().optional(),
      }),
    )
    .optional(),
});

type CreateShipmentResponse =
  | {
      ok: true;
      shipment: {
        shipment_id: string;
        carrier_name: string;
        workflow_status: string;
        payment_status: string;
        total: number | null;
        master_tracking_number: string;
        packages: Array<{
          id?: string;
          tracking_number?: string;
          label_url?: string;
        }>;
      };
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
        } satisfies CreateShipmentResponse,
        { status: 200 },
      );
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          ok: false,
          error: "Datos inválidos: se espera un objeto JSON",
        } satisfies CreateShipmentResponse,
        { status: 200 },
      );
    }

    // Validar con Zod
    const validationResult = CreateShipmentRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        {
          ok: false,
          error: `Datos inválidos: ${errors}`,
        } satisfies CreateShipmentResponse,
        { status: 200 },
      );
    }

    const payload = validationResult.data as SkydropxShipmentPayload;

    if (process.env.NODE_ENV !== "production") {
      console.log("[shipping/create-shipment] Request recibida:", {
        rate_id: payload.rate_id,
        from: payload.address_from.zip,
        to: payload.address_to.zip,
        parcels: payload.parcels.length,
        products: payload.products?.length || 0,
      });
    }

    // Llamar a Skydropx
    const response = await createShipment(payload);

    // Parsear respuesta
    const shipmentId = response.id || response.data?.id || "";
    const trackingNumber =
      response.master_tracking_number || response.data?.master_tracking_number || "";
    const carrierName = response.carrier_name || response.data?.carrier_name || "";
    const workflowStatus = response.workflow_status || response.data?.workflow_status || "";
    const paymentStatus = response.payment_status || response.data?.payment_status || "";
    const total = response.total || response.data?.total || null;

    // Extraer paquetes
    const packages: Array<{
      id?: string;
      tracking_number?: string;
      label_url?: string;
    }> = [];

    if (response.included && Array.isArray(response.included)) {
      for (const pkg of response.included) {
        packages.push({
          id: pkg.id,
          tracking_number: pkg.tracking_number,
          label_url: pkg.label_url,
        });
      }
    }

    if (!shipmentId) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[shipping/create-shipment] Respuesta sin shipmentId:", response);
      }
      return NextResponse.json(
        {
          ok: false,
          error: "No se recibió shipmentId de Skydropx",
        } satisfies CreateShipmentResponse,
        { status: 200 },
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[shipping/create-shipment] Envío creado:", {
        shipment_id: shipmentId,
        tracking_number: trackingNumber,
        carrier_name: carrierName,
      });
    }

    return NextResponse.json({
      ok: true,
      shipment: {
        shipment_id: shipmentId,
        carrier_name: carrierName,
        workflow_status: workflowStatus,
        payment_status: paymentStatus,
        total,
        master_tracking_number: trackingNumber,
        packages,
      },
    } satisfies CreateShipmentResponse);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[shipping/create-shipment] Error inesperado:", error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      } satisfies CreateShipmentResponse,
      { status: 200 },
    );
  }
}

