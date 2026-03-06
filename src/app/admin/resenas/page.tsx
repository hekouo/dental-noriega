import { notFound, redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin/access";
import AdminReviewsTableClient from "@/components/admin/reviews/AdminReviewsTable.client";

export const dynamic = "force-dynamic";

export default async function AdminResenasPage() {
  const access = await checkAdminAccess();
  if (access.status === "unauthenticated") {
    redirect("/cuenta");
  }
  if (access.status === "forbidden") {
    notFound();
  }

  return <AdminReviewsTableClient />;
}
