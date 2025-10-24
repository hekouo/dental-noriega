// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: [
        'drive.google.com',
        'lh3.googleusercontent.com',
        // por si acaso:
        'googleusercontent.com',
        'ggpht.com',
        'i.imgur.com',
      ],
      remotePatterns: [
        { protocol: 'https', hostname: 'drive.google.com', pathname: '/uc*' },
        { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
        { protocol: "https", hostname: "**.googleusercontent.com" },
        { protocol: "https", hostname: "**.ggpht.com" },
        { protocol: "https", hostname: "**.supabase.co" },
        { protocol: "https", hostname: "**.supabase.in" }
      ],
      formats: ['image/avif', 'image/webp']
    },
  };
  
  export default nextConfig;
  