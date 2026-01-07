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
		const { data: existing } = await supabase.from("orders").select("metadata").eq("id", body.orderId).single();
		const currentMetadata = ((existing as any)?.metadata as Record<string, unknown>) || {};

		const updatedMetadata = {
			...currentMetadata,
			shipping_address_override: body.shipping_address_override,
		};

		const { error: updateError } = await supabase
			.from("orders")
			.update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
			.eq("id", body.orderId);

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


