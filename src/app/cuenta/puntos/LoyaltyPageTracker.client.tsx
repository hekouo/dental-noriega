"use client";

import { useEffect, useRef } from "react";
import { trackLoyaltyAccountViewed } from "@/lib/analytics/events";
import { getTierForPoints } from "@/lib/loyalty/config";

type Props = {
  currentPoints: number;
  totalPoints: number;
};

/**
 * Componente client que trackea cuando se ve la página de puntos de lealtad
 */
export default function LoyaltyPageTracker({ currentPoints, totalPoints }: Props) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      const tier = getTierForPoints(currentPoints);
      trackLoyaltyAccountViewed({
        currentPoints,
        totalPoints,
        tierId: tier.id,
        tierName: tier.name,
      });
    }
  }, [currentPoints, totalPoints]);

  return null;
}

