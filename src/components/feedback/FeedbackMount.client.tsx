"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { FeedbackWidget } from "./FeedbackWidget.client";

export function FeedbackMount() {
  const pathname = usePathname();
  if (pathname?.startsWith("/checkout")) return null;
  return <FeedbackWidget />;
}
