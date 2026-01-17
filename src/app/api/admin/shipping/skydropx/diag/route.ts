import "server-only";
import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin/access";
import { getSkydropxApiHosts } from "@/lib/skydropx/client";

export const dynamic = "force-dynamic";

const safeHost = (url: string | null | undefined) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return null;
  }
};

const safePath = (url: string | null | undefined) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.pathname || "/";
  } catch {
    return null;
  }
};

export async function GET() {
  const access = await checkAdminAccess();
  if (access.status !== "allowed") {
    return NextResponse.json(
      { ok: false, code: "unauthorized", message: "No tienes permisos para realizar esta acción." },
      { status: 401 },
    );
  }

  const hosts = getSkydropxApiHosts();
  if (!hosts) {
    return NextResponse.json(
      { ok: false, code: "config_error", message: "Configuración de Skydropx incompleta." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    authBaseUrlHost: safeHost(hosts.authBaseUrl),
    quotationsBaseUrlHost: safeHost(hosts.quotationsBaseUrl),
    shipmentsBaseUrlHost: safeHost(hosts.restBaseUrl),
    oauthTokenUrlHost: safeHost(hosts.oauthTokenUrl),
    oauthTokenUrlPath: safePath(hosts.oauthTokenUrl),
    sources: hosts.sources,
  });
}
