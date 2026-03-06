import { notFound, redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin/access";
import AdminFeedbackTableClient from "@/components/admin/feedback/AdminFeedbackTable.client";

export const dynamic = "force-dynamic";

export default async function AdminOpinionesPage() {
  const access = await checkAdminAccess();
  if (access.status === "unauthenticated") {
    redirect("/cuenta");
  }
  if (access.status === "forbidden") {
    notFound();
  }

  return <AdminFeedbackTableClient />;
}
