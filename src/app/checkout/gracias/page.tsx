import { Suspense } from "react";
import GraciasClient from "./GraciasClient";

export default function Page() {
  return (
    <Suspense fallback={<p>Procesando pago…</p>}>
      <GraciasClient />
    </Suspense>
  );
}