// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      // Permite imágenes desde Google Photos/Drive renderizadas por lh3 y desde drive.google.com
      remotePatterns: [
        { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
        { protocol: "https", hostname: "drive.google.com", pathname: "/**" },
      ],
      // Alternativa simple:
      // domains: ["lh3.googleusercontent.com", "drive.google.com"],
    },
  };
  
  export default nextConfig;
  