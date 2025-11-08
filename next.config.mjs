/* eslint-env node */
/* global process */
import { URL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// next.config.mjs
/** @type {import('next').NextConfig} */
const withBundleAnalyzer = process.env.ANALYZE === "true"
  ? require("@next/bundle-analyzer")({
      enabled: true,
      openAnalyzer: false,
    })
  : (x) => x;

const remotePatterns = [
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "drive.google.com",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "api.qrserver.com",
    port: "",
    pathname: "/**",
  },
];

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  remotePatterns.push({
    protocol: supabase.protocol.replace(":", ""),
    hostname: supabase.hostname,
    port: supabase.port,
    pathname: "/**",
  });
}

const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns,
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

export default withBundleAnalyzer(nextConfig);