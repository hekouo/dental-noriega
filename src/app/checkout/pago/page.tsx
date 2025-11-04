"use client";

import React from "react";
import GuardsClient from "./GuardsClient";
import PagoClient from "./PagoClient";

export const dynamic = "force-dynamic";

export default function PagoPage() {
  return (
    <GuardsClient>
      <PagoClient />
    </GuardsClient>
  );
}
