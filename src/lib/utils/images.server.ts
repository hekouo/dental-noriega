// src/lib/utils/images.server.ts
import path from "path";
import { promises as fs } from "fs";

const exts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function driveToDirect(u: string) {
  if (/^https?:\/\/lh3\.googleusercontent\.com\//i.test(u)) return u;
  const m1 = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
  const m2 = u.match(/[?&](?:id|ids)=([a-zA-Z0-9_-]+)/);
  const id = m1?.[1] || m2?.[1];
  return id ? `https://lh3.googleusercontent.com/d/${id}=w1200` : u;
}

function encodeSegments(p: string) {
  return "/" + ["img", "products", ...p.split("/")].map(s => encodeURIComponent(s)).join("/");
}

async function existsPublic(rel: string) {
  const abs = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
  try {
    await fs.access(abs);
    return true;
  } catch {
    return false;
  }
}

// Genera candidatos de nombre
function* candidates(raw: string) {
  const base = raw.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = base.split("/");
  const filename = parts.pop() || "";
  const dir = parts.join("/");

  const nameNoExt = filename.replace(/\.[^.]+$/, "");
  const variants = new Set<string>([
    filename,
    filename.replace(/_/g, " "),
    filename.replace(/%20/g, " "),
    nameNoExt + "", // sin extensión
    nameNoExt.replace(/_/g, " "),
    nameNoExt.toLowerCase(),
    nameNoExt.replace(/\s+/g, "-").toLowerCase(),
  ]);

  for (const v of variants) {
    if (/\.[^.]+$/.test(v)) {
      yield encodeSegments(dir ? `${dir}/${v}` : v);
    } else {
      for (const e of exts) {
        yield encodeSegments(dir ? `${dir}/${v}${e}` : `${v}${e}`);
      }
    }
  }
}

export async function resolveImagePublicPath(raw: string): Promise<{ resolved: string; ok: boolean }> {
  if (!raw) return { resolved: "/img/products/placeholder.png", ok: false };

  // remota
  if (/^https?:\/\//i.test(raw)) {
    return {
      resolved: /^https?:\/\/drive\.google\.com\//i.test(raw) ? driveToDirect(raw) : raw,
      ok: true
    };
  }

  // local: probar candidatos
  for (const c of candidates(raw)) {
    if (await existsPublic(c)) {
      return { resolved: c, ok: true };
    }
  }
  
  return { resolved: "/img/products/placeholder.png", ok: false };
}
