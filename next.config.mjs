// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com", port: "", pathname: "/**" },
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
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