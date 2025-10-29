// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "lh4.googleusercontent.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "lh5.googleusercontent.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "lh6.googleusercontent.com", port: "", pathname: "/**" },
      // Wildcard: si Next no lo permite en tu versión, puedes quitar esta línea
      { protocol: "https", hostname: "*.googleusercontent.com", port: "", pathname: "/**" },
    ],
    unoptimized: true,
  },
};
export default nextConfig;