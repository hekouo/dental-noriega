export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import PedidosPageClient from "./ClientPage";

export default function PedidosPage() {
  return <PedidosPageClient />;
}
