"use client";

import React from "react";
import GuardsClient from "./GuardsClient";
import PagoClient from "./PagoClient";

export default function PagoPage() {
  return (
    <GuardsClient>
      <PagoClient />
    </GuardsClient>
  );
}
