import { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE.url;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/cuenta", "/cuenta/*", "/checkout", "/checkout/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
