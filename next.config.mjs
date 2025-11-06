// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com", port: "", pathname: "/**" },
    ],
    // Habilitar optimización para formatos modernos (AVIF/WebP)
    // Solo deshabilitar en desarrollo local si es necesario
    unoptimized: false, // Habilitar optimización para mejor performance
  },
  webpack: (config, { isServer }) => {
    // Hacer resend opcional: no fallar si no está instalado
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "resend": "commonjs resend",
      });
    }
    return config;
  },
};
export default nextConfig;