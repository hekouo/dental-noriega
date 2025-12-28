import { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE.url;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/cuenta",
          "/cuenta/*",
          "/checkout",
          "/checkout/*",
          "/auth",
          "/auth/*",
          "/forgot-password",
          "/update-password",
          "/admin",
          "/admin/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
