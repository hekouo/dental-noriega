"use client";
import { useEffect } from "react";
import { useRecentlyViewed } from "@/lib/hooks/useRecentlyViewed";

type Props = {
  slug: string;
};

export default function RecentlyViewedTracker({ slug }: Props) {
  const { push } = useRecentlyViewed();

  useEffect(() => {
    if (slug) {
      push(slug);
    }
  }, [slug, push]);

  return null;
}
