import { Suspense } from "react";
import GraciasContent from "./GraciasContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function GraciasPage() {
  return (
    <Suspense
      fallback={<div className="max-w-3xl mx-auto px-4 py-10">Cargando...</div>}
    >
      <GraciasContent />
    </Suspense>
  );
}
