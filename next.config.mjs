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

// Security headers para todas las rutas
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://www.googletagmanager.com",
      "img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
    ].join("; "),
  },
];

const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns,
  },
  trailingSlash: false,
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
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      // Security headers para todas las rutas
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
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
