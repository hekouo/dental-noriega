import { Suspense } from "react";
import GuardsClient from "./GuardsClient";
import PagoClient from "./PagoClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PagoPage() {
  return (
    <Suspense fallback={null}>
      <GuardsClient>
        <PagoClient />
      </GuardsClient>
    </Suspense>
  );
}
