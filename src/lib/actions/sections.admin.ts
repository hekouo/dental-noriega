"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminSection,
  updateAdminSection,
} from "@/lib/supabase/sections.admin.server";

export async function createSectionAction(formData: FormData): Promise<void> {
  const slug = formData.get("slug")?.toString() || "";
  const name = formData.get("name")?.toString() || "";

  if (!slug || !name) {
    redirect("/admin/secciones?error=campos_requeridos");
    return;
  }

  try {
    await createAdminSection({ slug, name });

    // Revalidar rutas
    revalidatePath("/admin/secciones");
    revalidatePath("/admin/productos");
    revalidatePath("/catalogo", "layout");

    redirect("/admin/secciones");
  } catch (err) {
    console.error("[createSectionAction] Error:", err);
    redirect(
      `/admin/secciones?error=${encodeURIComponent(err instanceof Error ? err.message : "error_desconocido")}`,
    );
  }
}

export async function updateSectionAction(formData: FormData): Promise<void> {
  const id = formData.get("id")?.toString() || "";
  const slug = formData.get("slug")?.toString() || "";
  const name = formData.get("name")?.toString() || "";

  if (!id || !slug || !name) {
    redirect(`/admin/secciones/${id}/editar?error=campos_requeridos`);
    return;
  }

  try {
    await updateAdminSection(id, { slug, name });

    // Revalidar rutas
    revalidatePath("/admin/secciones");
    revalidatePath(`/admin/secciones/${id}/editar`);
    revalidatePath("/admin/productos");
    revalidatePath("/catalogo", "layout");

    redirect("/admin/secciones");
  } catch (err) {
    console.error("[updateSectionAction] Error:", err);
    redirect(
      `/admin/secciones/${id}/editar?error=${encodeURIComponent(err instanceof Error ? err.message : "error_desconocido")}`,
    );
  }
}

