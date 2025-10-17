export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://tu-dominio.com/sitemap.xml",
  };
}
