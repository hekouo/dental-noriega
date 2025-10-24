// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      // Permite imágenes desde Google Photos/Drive renderizadas por lh3 y desde drive.google.com
      remotePatterns: [
        { protocol: "https", hostname: "**.googleusercontent.com" },
        { protocol: "https", hostname: "**.ggpht.com" },
        { protocol: "https", hostname: "**.supabase.co" },
        { protocol: "https", hostname: "**.supabase.in" }
      ],
      formats: ["image/avif", "image/webp"]
      // Alternativa simple:
      // domains: ["lh3.googleusercontent.com", "drive.google.com"],
    },
  };
  
  export default nextConfig;
  