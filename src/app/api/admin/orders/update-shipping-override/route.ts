import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import "server-only";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ShippingAddress = {
	name: string;
	phone?: string | null;
	email?: string | null;
	address1: string;
	address2?: string | null;
	city: string;
	state: string;
	postal_code: string;
	country?: string;
};

export async function POST(req: NextRequest) {
	try {
		const access = await checkAdminAccess();
		if (access.status !== "allowed") {
			return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
		}

		const body = (await req.json().catch(() => null)) as
			| { orderId?: string; shipping_address_override?: ShippingAddress }
			| null;
		if (!body || !body.orderId || !body.shipping_address_override) {
			return NextResponse.json(
				{ ok: false, error: "invalid_request", message: "orderId y shipping_address_override son requeridos" },
				{ status: 400 },
			);
		}

		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
		if (!supabaseUrl || !serviceRoleKey) {
			return NextResponse.json({ ok: false, error: "config_error" }, { status: 500 });
		}
		const supabase = createClient(supabaseUrl, serviceRoleKey, {
			auth: { autoRefreshToken: false, persistSession: false },
		});

		// Leer metadata actual
		const { data: existing } = await supabase
			.from("orders")
			.select("metadata")
			.eq("id", body.orderId)
			.single();
		
		const updatedMetadata = {
			...((existing as any)?.metadata as Record<string, unknown> || {}),
			shipping_address_override: body.shipping_address_override,
		};
		
		// CRÍTICO: Releer metadata justo antes del update para evitar race conditions
		const { data: freshOrderData } = await supabase
			.from("orders")
			.select("metadata, updated_at")
			.eq("id", body.orderId)
			.single();
		
		const freshMetadata = ((freshOrderData as any)?.metadata as Record<string, unknown>) || {};
		const freshUpdatedAtFinal = (freshOrderData as any)?.updated_at as string | null | undefined;
		
		// Aplicar preserveRateUsed para garantizar que rate_used nunca quede null
		const { preserveRateUsed, ensureRateUsedInMetadata } = await import("@/lib/shipping/normalizeShippingMetadata");
		const { logPreWrite, logPostWrite } = await import("@/lib/shipping/metadataWriterLogger");
		
		const finalMetadataWithPreserve = preserveRateUsed(freshMetadata, updatedMetadata);
		
		// CRÍTICO: Asegurar que rate_used esté presente en el payload final antes de escribir
		const finalMetadata = ensureRateUsedInMetadata(finalMetadataWithPreserve);
		
		// INSTRUMENTACIÓN PRE-WRITE
		logPreWrite("update-shipping-override", body.orderId, freshMetadata, freshUpdatedAtFinal, finalMetadata);

		const { data: updatedOrder, error: updateError } = await supabase
			.from("orders")
			.update({ metadata: finalMetadata, updated_at: new Date().toISOString() })
			.eq("id", body.orderId)
			.select("id, metadata, updated_at")
			.single();
		
		// INSTRUMENTACIÓN POST-WRITE
		if (updatedOrder) {
			const postWriteMetadata = ((updatedOrder as any).metadata as Record<string, unknown>) || {};
			const postWriteUpdatedAt = (updatedOrder as any).updated_at as string | null | undefined;
			logPostWrite("update-shipping-override", body.orderId, postWriteMetadata, postWriteUpdatedAt);
		}

		if (updateError) {
			return NextResponse.json({ ok: false, error: "update_failed", details: updateError.message }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch (err) {
		return NextResponse.json(
			{ ok: false, error: "unknown_error", message: err instanceof Error ? err.message : "Error desconocido" },
			{ status: 500 },
		);
	}
}


