export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import DatosPageClient from "./ClientPage";

export default function DatosPage() {
  return <DatosPageClient />;
}
