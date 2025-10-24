// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      // Permite imágenes desde Google Photos/Drive renderizadas por lh3 y desde drive.google.com
      remotePatterns: [
        { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
        { protocol: "https", hostname: "drive.google.com", pathname: "/**" },
        { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
        { protocol: "https", hostname: "*.supabase.in", pathname: "/storage/v1/object/public/**" },
      ],
      // Alternativa simple:
      // domains: ["lh3.googleusercontent.com", "drive.google.com"],
    },
  };
  
  export default nextConfig;
  